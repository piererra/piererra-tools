# =============================================================
# app.py — NFSU2 Save Data Editor by Piererra
# tkinter GUI layer — full desktop interface
#
# Sections:
#   Theme        — colour/font constants (NFSU2 dark-lime palette)
#   I18n         — 15-language translation system
#   Widgets      — reusable styled widget helpers
#   App          — main Application class
#     _build_*   — UI section builders
#     _on_*      — event handlers
#     _refresh_* — state → UI sync helpers
#   Toast        — floating notification system
# =============================================================

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import threading

from nfsu2_editor.core import SaveEditor
from nfsu2_editor.cars import get_car_names

# ─────────────────────────────────────────────────────────────
# THEME
# ─────────────────────────────────────────────────────────────

class Theme:
    BG_DEEP    = "#080A10"
    BG_PANEL   = "#0C0F18"
    BG_CARD    = "#10141F"
    BG_INPUT   = "#07090F"
    BG_HOVER   = "#141828"

    LIME       = "#7DFF00"
    GOLD       = "#E0B030"
    BLUE       = "#4A9EFF"
    RED        = "#FF4040"
    CYAN       = "#00F5FF"

    TEXT_MAIN  = "#CDD3E8"
    TEXT_MUTED = "#424B68"
    TEXT_DIM   = "#2A3050"
    BORDER     = "#1A1F30"
    BORDER_LIT = "#2A3050"

    FONT_MONO  = ("Courier New", 9)
    FONT_MONO_SM = ("Courier New", 8)
    FONT_MONO_LG = ("Courier New", 11, "bold")
    FONT_TITLE = ("Courier New", 14, "bold")
    FONT_HEAD  = ("Courier New", 10, "bold")

    PAD        = 10
    PAD_SM     = 5
    RADIUS     = 4


# ─────────────────────────────────────────────────────────────
# I18N — 15 languages
# ─────────────────────────────────────────────────────────────

LANGS = {
    "en": "English",
    "fr": "Français",
    "es": "Español",
    "de": "Deutsch",
    "pt": "Português",
    "ru": "Русский",
    "zh": "中文 (简体)",
    "ja": "日本語",
    "ko": "한국어",
    "ar": "العربية",
    "it": "Italiano",
    "tr": "Türkçe",
    "id": "Bahasa Indonesia",
    "pl": "Polski",
    "nl": "Nederlands",
}

STRINGS = {
    # Window / header
    "app.title":          {"en":"NFSU2 Save Editor","fr":"Éditeur NFSU2","es":"Editor NFSU2","de":"NFSU2 Editor","pt":"Editor NFSU2","ru":"Редактор NFSU2","zh":"NFSU2 存档编辑器","ja":"NFSU2 セーブエディタ","ko":"NFSU2 세이브 에디터","ar":"محرر NFSU2","it":"Editor NFSU2","tr":"NFSU2 Editör","id":"Editor NFSU2","pl":"Edytor NFSU2","nl":"NFSU2 Editor"},
    "app.subtitle":       {"en":"Need for Speed Underground 2 — Save Data Editor","fr":"Need for Speed Underground 2 — Éditeur de sauvegarde","es":"Need for Speed Underground 2 — Editor de guardado","de":"Need for Speed Underground 2 — Speicherstand-Editor","pt":"Need for Speed Underground 2 — Editor de save","ru":"Need for Speed Underground 2 — Редактор сохранений","zh":"Need for Speed Underground 2 — 存档编辑器","ja":"Need for Speed Underground 2 — セーブデータエディタ","ko":"Need for Speed Underground 2 — 세이브 에디터","ar":"Need for Speed Underground 2 — محرر الحفظ","it":"Need for Speed Underground 2 — Editor salvataggio","tr":"Need for Speed Underground 2 — Kayıt Editörü","id":"Need for Speed Underground 2 — Editor simpanan","pl":"Need for Speed Underground 2 — Edytor zapisu","nl":"Need for Speed Underground 2 — Save Editor"},
    "app.by":             {"en":"by Piererra","fr":"par Piererra","es":"por Piererra","de":"von Piererra","pt":"por Piererra","ru":"от Piererra","zh":"由 Piererra 制作","ja":"Piererra 作","ko":"Piererra 제작","ar":"بواسطة Piererra","it":"di Piererra","tr":"Piererra tarafından","id":"oleh Piererra","pl":"przez Piererra","nl":"door Piererra"},
    # File section
    "file.load":          {"en":"Load Save File","fr":"Charger le fichier","es":"Cargar guardado","de":"Spielstand laden","pt":"Carregar save","ru":"Загрузить файл","zh":"加载存档","ja":"セーブ読み込み","ko":"세이브 불러오기","ar":"تحميل الملف","it":"Carica file","tr":"Dosya yükle","id":"Muat file","pl":"Wczytaj plik","nl":"Laad save"},
    "file.backup":        {"en":"Auto-backup on load","fr":"Sauvegarde auto au chargement","es":"Copia de seguridad automática","de":"Automatisches Backup","pt":"Backup automático","ru":"Авто-резервная копия","zh":"加载时自动备份","ja":"読込時自動バックアップ","ko":"로드 시 자동 백업","ar":"نسخ احتياطي تلقائي","it":"Backup automatico","tr":"Otomatik yedek","id":"Cadangan otomatis","pl":"Auto-kopia przy ładowaniu","nl":"Automatisch backup"},
    "file.save_bak":      {"en":"Download Backup (.bak)","fr":"Télécharger backup (.bak)","es":"Descargar copia (.bak)","de":"Backup herunterladen (.bak)","pt":"Baixar backup (.bak)","ru":"Скачать резервную копию (.bak)","zh":"下载备份 (.bak)","ja":"バックアップDL (.bak)","ko":"백업 다운로드 (.bak)","ar":"تنزيل النسخة الاحتياطية","it":"Scarica backup (.bak)","tr":"Yedek indir (.bak)","id":"Unduh cadangan (.bak)","pl":"Pobierz backup (.bak)","nl":"Download backup (.bak)"},
    # Info bar
    "info.profile":       {"en":"PROFILE","fr":"PROFIL","es":"PERFIL","de":"PROFIL","pt":"PERFIL","ru":"ПРОФИЛЬ","zh":"档案","ja":"プロフィール","ko":"프로필","ar":"الملف","it":"PROFILO","tr":"PROFİL","id":"PROFIL","pl":"PROFIL","nl":"PROFIEL"},
    "info.money":         {"en":"MONEY","fr":"ARGENT","es":"DINERO","de":"GELD","pt":"DINHEIRO","ru":"ДЕНЬГИ","zh":"金钱","ja":"お金","ko":"돈","ar":"المال","it":"DENARO","tr":"PARA","id":"UANG","pl":"PIENIĄDZE","nl":"GELD"},
    "info.slots":         {"en":"CAR SLOTS","fr":"EMPLACEMENTS","es":"RANURAS","de":"STELLPLÄTZE","pt":"SLOTS","ru":"СЛОТЫ","zh":"车位","ja":"スロット","ko":"슬롯","ar":"الفتحات","it":"SLOT AUTO","tr":"ARABA YUVASI","id":"SLOT MOBIL","pl":"MIEJSCA","nl":"AUTOPLAATSEN"},
    "info.header":        {"en":"HEADER","fr":"EN-TÊTE","es":"CABECERA","de":"KOPFZEILE","pt":"CABEÇALHO","ru":"ЗАГОЛОВОК","zh":"文件头","ja":"ヘッダー","ko":"헤더","ar":"الترويسة","it":"INTESTAZIONE","tr":"BAŞLIK","id":"HEADER","pl":"NAGŁÓWEK","nl":"HEADER"},
    "info.size":          {"en":"SIZE","fr":"TAILLE","es":"TAMAÑO","de":"GRÖSSE","pt":"TAMANHO","ru":"РАЗМЕР","zh":"大小","ja":"サイズ","ko":"크기","ar":"الحجم","it":"DIMENSIONE","tr":"BOYUT","id":"UKURAN","pl":"ROZMIAR","nl":"GROOTTE"},
    "info.valid":         {"en":"VALID ✓","fr":"VALIDE ✓","es":"VÁLIDO ✓","de":"GÜLTIG ✓","pt":"VÁLIDO ✓","ru":"ВЕРНЫЙ ✓","zh":"有效 ✓","ja":"有効 ✓","ko":"유효 ✓","ar":"صالح ✓","it":"VALIDO ✓","tr":"GEÇERLİ ✓","id":"VALID ✓","pl":"PRAWIDŁOWY ✓","nl":"GELDIG ✓"},
    "info.invalid":       {"en":"INVALID ✗","fr":"INVALIDE ✗","es":"INVÁLIDO ✗","de":"UNGÜLTIG ✗","pt":"INVÁLIDO ✗","ru":"НЕВЕРНЫЙ ✗","zh":"无效 ✗","ja":"無効 ✗","ko":"유효하지 않음 ✗","ar":"غير صالح ✗","it":"NON VALIDO ✗","tr":"GEÇERSİZ ✗","id":"TIDAK VALID ✗","pl":"NIEPRAWIDŁOWY ✗","nl":"ONGELDIG ✗"},
    "info.no_save":       {"en":"No save loaded","fr":"Aucun fichier chargé","es":"Sin guardado","de":"Kein Spielstand","pt":"Nenhum save","ru":"Нет файла","zh":"未加载存档","ja":"未読み込み","ko":"세이브 없음","ar":"لا يوجد حفظ","it":"Nessun file","tr":"Kayıt yok","id":"Tidak ada simpanan","pl":"Brak pliku","nl":"Geen save"},
    # Profile section
    "sec.profile":        {"en":"Profile","fr":"Profil","es":"Perfil","de":"Profil","pt":"Perfil","ru":"Профиль","zh":"档案","ja":"プロフィール","ko":"프로필","ar":"الملف الشخصي","it":"Profilo","tr":"Profil","id":"Profil","pl":"Profil","nl":"Profiel"},
    "sec.name":           {"en":"Profile Name","fr":"Nom de profil","es":"Nombre de perfil","de":"Profilname","pt":"Nome do perfil","ru":"Имя профиля","zh":"档案名称","ja":"プロフィール名","ko":"프로필 이름","ar":"اسم الملف","it":"Nome profilo","tr":"Profil adı","id":"Nama profil","pl":"Nazwa profilu","nl":"Profielnaam"},
    "sec.name_hint":      {"en":"max 7 alphanumeric","fr":"max 7 caractères","es":"máx. 7 alfanumérico","de":"max. 7 alphanumerisch","pt":"máx. 7 alfanumérico","ru":"макс. 7 символов","zh":"最多7位字母数字","ja":"最大7文字英数字","ko":"최대 7자 영숫자","ar":"أقصى 7 أحرف","it":"max 7 alfanumerico","tr":"maks. 7 alfanümerik","id":"maks. 7 alfanumerik","pl":"maks. 7 znaków","nl":"max 7 alfanumeriek"},
    "sec.money":          {"en":"Money","fr":"Argent","es":"Dinero","de":"Geld","pt":"Dinheiro","ru":"Деньги","zh":"金钱","ja":"お金","ko":"돈","ar":"المال","it":"Denaro","tr":"Para","id":"Uang","pl":"Pieniądze","nl":"Geld"},
    "sec.money_hint":     {"en":"0 – 2,147,483,647","fr":"0 – 2 147 483 647","es":"0 – 2.147.483.647","de":"0 – 2.147.483.647","pt":"0 – 2.147.483.647","ru":"0 – 2 147 483 647","zh":"0 – 2,147,483,647","ja":"0 ～ 2,147,483,647","ko":"0 ~ 2,147,483,647","ar":"0 – 2,147,483,647","it":"0 – 2.147.483.647","tr":"0 – 2.147.483.647","id":"0 – 2.147.483.647","pl":"0 – 2 147 483 647","nl":"0 – 2.147.483.647"},
    "sec.apply":          {"en":"Apply & Save","fr":"Appliquer & Enregistrer","es":"Aplicar y guardar","de":"Anwenden & Speichern","pt":"Aplicar e salvar","ru":"Применить и сохранить","zh":"应用并保存","ja":"適用して保存","ko":"적용 및 저장","ar":"تطبيق وحفظ","it":"Applica e salva","tr":"Uygula ve kaydet","id":"Terapkan & simpan","pl":"Zastosuj i zapisz","nl":"Toepassen & opslaan"},
    # Car slots section
    "sec.slots":          {"en":"Car Slots","fr":"Emplacements voiture","es":"Ranuras de coche","de":"Autostellplätze","pt":"Slots de carro","ru":"Слоты машин","zh":"车位","ja":"カースロット","ko":"자동차 슬롯","ar":"فتحات السيارات","it":"Slot auto","tr":"Araba yuvaları","id":"Slot mobil","pl":"Miejsca na samochody","nl":"Autoplaatsen"},
    "slot.in_use":        {"en":"IN USE","fr":"UTILISÉ","es":"EN USO","de":"BELEGT","pt":"EM USO","ru":"ЗАНЯТ","zh":"已使用","ja":"使用中","ko":"사용 중","ar":"قيد الاستخدام","it":"IN USO","tr":"KULLANILIYOR","id":"DIGUNAKAN","pl":"UŻYWANE","nl":"IN GEBRUIK"},
    "slot.empty":         {"en":"EMPTY","fr":"VIDE","es":"VACÍO","de":"LEER","pt":"VAZIO","ru":"ПУСТО","zh":"空","ja":"空","ko":"비어있음","ar":"فارغ","it":"VUOTO","tr":"BOŞ","id":"KOSONG","pl":"PUSTE","nl":"LEEG"},
    "slot.max":           {"en":"MAX","fr":"MAX","es":"MAX","de":"MAX","pt":"MAX","ru":"МАКС","zh":"MAX","ja":"MAX","ko":"MAX","ar":"MAX","it":"MAX","tr":"MAX","id":"MAX","pl":"MAX","nl":"MAX"},
    "slot.nil":           {"en":"NIL","fr":"NIL","es":"NIL","de":"NIL","pt":"NIL","ru":"НОЛЬ","zh":"NIL","ja":"NIL","ko":"NIL","ar":"NIL","it":"NIL","tr":"NIL","id":"NIL","pl":"NIL","nl":"NIL"},
    "slot.unlock":        {"en":"UNLOCK","fr":"DÉBLOQUER","es":"DESBLOQUEAR","de":"FREISCHALTEN","pt":"DESBLOQUEAR","ru":"РАЗБЛОКИРОВАТЬ","zh":"解锁","ja":"解放","ko":"해제","ar":"فتح","it":"SBLOCCA","tr":"AÇ","id":"BUKA","pl":"ODBLOKUJ","nl":"ONTGRENDEL"},
    # Cheats section
    "sec.cheats":         {"en":"Cheats","fr":"Triches","es":"Trucos","de":"Cheats","pt":"Trapaças","ru":"Читы","zh":"作弊","ja":"チート","ko":"치트","ar":"الغش","it":"Trucchi","tr":"Hileler","id":"Cheat","pl":"Cheaty","nl":"Cheats"},
    "cheat.max_money":    {"en":"Max Money","fr":"Argent max","es":"Dinero máximo","de":"Max Geld","pt":"Dinheiro máximo","ru":"Макс деньги","zh":"最大金钱","ja":"金額最大化","ko":"최대 돈","ar":"أقصى مال","it":"Soldi massimi","tr":"Maks para","id":"Uang maks","pl":"Maks pieniędzy","nl":"Max geld"},
    "cheat.unlock_slots": {"en":"Unlock All Car Slots","fr":"Déverrouiller tous les emplacements","es":"Desbloquear todas las ranuras","de":"Alle Stellplätze freischalten","pt":"Desbloquear todos os slots","ru":"Разблокировать все слоты","zh":"解锁所有车位","ja":"全スロット解放","ko":"모든 슬롯 해제","ar":"فتح جميع الفتحات","it":"Sblocca tutti gli slot","tr":"Tüm yuvaları aç","id":"Buka semua slot","pl":"Odblokuj wszystkie miejsca","nl":"Alle slots ontgrendelen"},
    "cheat.unlock_parts": {"en":"Unlock All Parts","fr":"Déverrouiller toutes les pièces","es":"Desbloquear todas las piezas","de":"Alle Teile freischalten","pt":"Desbloquear todas as peças","ru":"Разблокировать все детали","zh":"解锁所有零件","ja":"全パーツ解放","ko":"모든 파츠 해제","ar":"فتح جميع الأجزاء","it":"Sblocca tutti i pezzi","tr":"Tüm parçaları aç","id":"Buka semua suku cadang","pl":"Odblokuj wszystkie części","nl":"Alle onderdelen ontgrendelen"},
    # Clone section
    "sec.clone":          {"en":"Clone Save","fr":"Cloner la sauvegarde","es":"Clonar guardado","de":"Spielstand klonen","pt":"Clonar save","ru":"Клонировать","zh":"克隆存档","ja":"セーブをクローン","ko":"세이브 복제","ar":"استنساخ الحفظ","it":"Clona salvataggio","tr":"Kaydı klonla","id":"Klon simpanan","pl":"Klonuj zapis","nl":"Save klonen"},
    "clone.new_name":     {"en":"New Profile Name","fr":"Nouveau nom de profil","es":"Nuevo nombre de perfil","de":"Neuer Profilname","pt":"Novo nome de perfil","ru":"Новое имя профиля","zh":"新档案名称","ja":"新しいプロフィール名","ko":"새 프로필 이름","ar":"اسم ملف جديد","it":"Nuovo nome profilo","tr":"Yeni profil adı","id":"Nama profil baru","pl":"Nowa nazwa profilu","nl":"Nieuwe profielnaam"},
    "clone.btn":          {"en":"Clone & Save","fr":"Cloner & Enregistrer","es":"Clonar y guardar","de":"Klonen & Speichern","pt":"Clonar e salvar","ru":"Клонировать и сохранить","zh":"克隆并保存","ja":"クローンして保存","ko":"복제 및 저장","ar":"استنساخ وحفظ","it":"Clona e salva","tr":"Klonla ve kaydet","id":"Klon & simpan","pl":"Klonuj i zapisz","nl":"Klonen & opslaan"},
    # Create new profile
    "sec.create":         {"en":"Create New Profile","fr":"Créer un nouveau profil","es":"Crear nuevo perfil","de":"Neues Profil erstellen","pt":"Criar novo perfil","ru":"Создать новый профиль","zh":"创建新档案","ja":"新しいプロフィール作成","ko":"새 프로필 만들기","ar":"إنشاء ملف جديد","it":"Crea nuovo profilo","tr":"Yeni profil oluştur","id":"Buat profil baru","pl":"Utwórz nowy profil","nl":"Nieuw profiel aanmaken"},
    "create.name":        {"en":"Profile Name","fr":"Nom de profil","es":"Nombre de perfil","de":"Profilname","pt":"Nome do perfil","ru":"Имя профиля","zh":"档案名称","ja":"プロフィール名","ko":"프로필 이름","ar":"اسم الملف","it":"Nome profilo","tr":"Profil adı","id":"Nama profil","pl":"Nazwa profilu","nl":"Profielnaam"},
    "create.money":       {"en":"Starting Money","fr":"Argent de départ","es":"Dinero inicial","de":"Startgeld","pt":"Dinheiro inicial","ru":"Начальные деньги","zh":"初始金钱","ja":"スタートマネー","ko":"시작 돈","ar":"المال الابتدائي","it":"Soldi iniziali","tr":"Başlangıç parası","id":"Uang awal","pl":"Pieniądze startowe","nl":"Startgeld"},
    "create.car":         {"en":"Starting Car","fr":"Voiture de départ","es":"Coche inicial","de":"Startauto","pt":"Carro inicial","ru":"Стартовый автомобиль","zh":"初始车辆","ja":"スタートカー","ko":"시작 차량","ar":"سيارة البداية","it":"Auto iniziale","tr":"Başlangıç arabası","id":"Mobil awal","pl":"Samochód startowy","nl":"Startauto"},
    "create.car_default": {"en":"Default (Peugeot 206)","fr":"Défaut (Peugeot 206)","es":"Por defecto (Peugeot 206)","de":"Standard (Peugeot 206)","pt":"Padrão (Peugeot 206)","ru":"По умолчанию (Peugeot 206)","zh":"默认 (Peugeot 206)","ja":"デフォルト (Peugeot 206)","ko":"기본값 (Peugeot 206)","ar":"الافتراضي (بيجو 206)","it":"Predefinito (Peugeot 206)","tr":"Varsayılan (Peugeot 206)","id":"Default (Peugeot 206)","pl":"Domyślny (Peugeot 206)","nl":"Standaard (Peugeot 206)"},
    "create.unlock_parts":{"en":"Unlock All Parts","fr":"Déverrouiller toutes les pièces","es":"Desbloquear todas las piezas","de":"Alle Teile freischalten","pt":"Desbloquear peças","ru":"Разблокировать все детали","zh":"解锁所有零件","ja":"全パーツ解放","ko":"모든 파츠 해제","ar":"فتح جميع الأجزاء","it":"Sblocca tutti i pezzi","tr":"Tüm parçaları aç","id":"Buka semua suku cadang","pl":"Odblokuj wszystkie części","nl":"Alle onderdelen ontgrendelen"},
    "create.btn":         {"en":"Create & Save","fr":"Créer & Enregistrer","es":"Crear y guardar","de":"Erstellen & Speichern","pt":"Criar e salvar","ru":"Создать и сохранить","zh":"创建并保存","ja":"作成して保存","ko":"만들기 및 저장","ar":"إنشاء وحفظ","it":"Crea e salva","tr":"Oluştur ve kaydet","id":"Buat & simpan","pl":"Utwórz i zapisz","nl":"Aanmaken & opslaan"},
    # Language selector
    "lang.label":         {"en":"Language","fr":"Langue","es":"Idioma","de":"Sprache","pt":"Idioma","ru":"Язык","zh":"语言","ja":"言語","ko":"언어","ar":"اللغة","it":"Lingua","tr":"Dil","id":"Bahasa","pl":"Język","nl":"Taal"},
    # Toast messages
    "toast.loaded":       {"en":"Save loaded: {f}","fr":"Fichier chargé : {f}","es":"Guardado cargado: {f}","de":"Spielstand geladen: {f}","pt":"Save carregado: {f}","ru":"Сохранение загружено: {f}","zh":"存档已加载：{f}","ja":"セーブ読込: {f}","ko":"세이브 불러옴: {f}","ar":"تم التحميل: {f}","it":"File caricato: {f}","tr":"Kayıt yüklendi: {f}","id":"Dimuat: {f}","pl":"Wczytano: {f}","nl":"Save geladen: {f}"},
    "toast.backed_up":    {"en":"Backup saved.","fr":"Backup enregistré.","es":"Copia guardada.","de":"Backup gespeichert.","pt":"Backup salvo.","ru":"Резервная копия сохранена.","zh":"备份已保存。","ja":"バックアップ保存済み。","ko":"백업 저장됨.","ar":"تم حفظ النسخة الاحتياطية.","it":"Backup salvato.","tr":"Yedek kaydedildi.","id":"Cadangan disimpan.","pl":"Kopia zapisana.","nl":"Backup opgeslagen."},
    "toast.applied":      {"en":"Save written to disk.","fr":"Fichier enregistré.","es":"Guardado escrito.","de":"Spielstand gespeichert.","pt":"Save salvo.","ru":"Файл сохранён.","zh":"存档已写入磁盘。","ja":"保存しました。","ko":"저장 완료.","ar":"تم الحفظ.","it":"File salvato.","tr":"Dosya kaydedildi.","id":"File disimpan.","pl":"Plik zapisany.","nl":"Opgeslagen."},
    "toast.cloned":       {"en":"Cloned as {n}.","fr":"Cloné en {n}.","es":"Clonado como {n}.","de":"Geklont als {n}.","pt":"Clonado como {n}.","ru":"Клонировано как {n}.","zh":"已克隆为 {n}。","ja":"{n} としてクローン。","ko":"{n}으로 복제됨.","ar":"تم الاستنساخ كـ {n}.","it":"Clonato come {n}.","tr":"{n} olarak klonlandı.","id":"Dikloning sebagai {n}.","pl":"Sklonowano jako {n}.","nl":"Gekloond als {n}."},
    "toast.created":      {"en":"New save created: {n}.","fr":"Nouveau fichier créé : {n}.","es":"Nuevo guardado: {n}.","de":"Neuer Spielstand: {n}.","pt":"Novo save criado: {n}.","ru":"Новый файл создан: {n}.","zh":"新存档已创建：{n}。","ja":"新しいセーブ作成: {n}。","ko":"새 세이브 생성: {n}.","ar":"تم إنشاء ملف جديد: {n}.","it":"Nuovo file creato: {n}.","tr":"Yeni kayıt oluşturuldu: {n}.","id":"Simpanan baru dibuat: {n}.","pl":"Nowy zapis utworzony: {n}.","nl":"Nieuw save aangemaakt: {n}."},
    "toast.slot_maxed":   {"en":"Slot {n} performance maxed.","fr":"Emplacement {n} maximisé.","es":"Ranura {n} al máximo.","de":"Slot {n} maximiert.","pt":"Slot {n} no máximo.","ru":"Слот {n} максимизирован.","zh":"车位 {n} 性能已最大化。","ja":"スロット {n} 最大化。","ko":"슬롯 {n} 최대화.","ar":"تم رفع أداء الفتحة {n}.","it":"Slot {n} al massimo.","tr":"Yuva {n} maksimize edildi.","id":"Slot {n} dimaksimalkan.","pl":"Miejsce {n} zmaksymalizowane.","nl":"Slot {n} gemaximaliseerd."},
    "toast.slot_zeroed":  {"en":"Slot {n} performance zeroed.","fr":"Emplacement {n} remis à zéro.","es":"Ranura {n} a cero.","de":"Slot {n} auf Null.","pt":"Slot {n} zerado.","ru":"Слот {n} обнулён.","zh":"车位 {n} 性能已清零。","ja":"スロット {n} ゼロ化。","ko":"슬롯 {n} 초기화.","ar":"تم تصفير أداء الفتحة {n}.","it":"Slot {n} azzerato.","tr":"Yuva {n} sıfırlandı.","id":"Slot {n} dinolkan.","pl":"Miejsce {n} wyzerowane.","nl":"Slot {n} genulld."},
    "toast.slot_unlocked":{"en":"Slot {n} unlocked.","fr":"Emplacement {n} déverrouillé.","es":"Ranura {n} desbloqueada.","de":"Slot {n} freigeschaltet.","pt":"Slot {n} desbloqueado.","ru":"Слот {n} разблокирован.","zh":"车位 {n} 已解锁。","ja":"スロット {n} 解放。","ko":"슬롯 {n} 해제.","ar":"تم فتح الفتحة {n}.","it":"Slot {n} sbloccato.","tr":"Yuva {n} açıldı.","id":"Slot {n} dibuka.","pl":"Miejsce {n} odblokowane.","nl":"Slot {n} ontgrendeld."},
    "toast.money_maxed":  {"en":"Money set to maximum.","fr":"Argent au maximum.","es":"Dinero al máximo.","de":"Geld auf Maximum.","pt":"Dinheiro ao máximo.","ru":"Деньги на максимуме.","zh":"金钱已最大化。","ja":"お金を最大化しました。","ko":"돈 최대화.","ar":"تم تعيين المال إلى الحد الأقصى.","it":"Soldi al massimo.","tr":"Para maksimuma ayarlandı.","id":"Uang dimaksimalkan.","pl":"Pieniądze na maksimum.","nl":"Geld op maximum."},
    "toast.slots_unlocked":{"en":"All 5 slots unlocked.","fr":"5 emplacements déverrouillés.","es":"5 ranuras desbloqueadas.","de":"5 Slots freigeschaltet.","pt":"5 slots desbloqueados.","ru":"5 слотов разблокировано.","zh":"全部5个车位已解锁。","ja":"全5スロット解放。","ko":"5개 슬롯 해제.","ar":"تم فتح 5 فتحات.","it":"5 slot sbloccati.","tr":"5 yuva açıldı.","id":"5 slot dibuka.","pl":"5 miejsc odblokowanych.","nl":"5 slots ontgrendeld."},
    "toast.parts_unlocked":{"en":"All parts unlocked.","fr":"Toutes les pièces déverrouillées.","es":"Todas las piezas desbloqueadas.","de":"Alle Teile freigeschaltet.","pt":"Todas as peças desbloqueadas.","ru":"Все детали разблокированы.","zh":"所有零件已解锁。","ja":"全パーツ解放。","ko":"모든 파츠 해제.","ar":"تم فتح جميع الأجزاء.","it":"Tutti i pezzi sbloccati.","tr":"Tüm parçalar açıldı.","id":"Semua suku cadang dibuka.","pl":"Wszystkie części odblokowane.","nl":"Alle onderdelen ontgrendeld."},
    "toast.no_save":      {"en":"No save loaded.","fr":"Aucun fichier chargé.","es":"Sin guardado cargado.","de":"Kein Spielstand geladen.","pt":"Nenhum save carregado.","ru":"Нет загруженного файла.","zh":"未加载存档。","ja":"セーブが未読み込みです。","ko":"세이브가 없습니다.","ar":"لم يتم تحميل أي حفظ.","it":"Nessun file caricato.","tr":"Kayıt yüklenmedi.","id":"Tidak ada simpanan dimuat.","pl":"Brak wczytanego pliku.","nl":"Geen save geladen."},
    "toast.bak_saved":    {"en":"Backup file saved.","fr":"Fichier backup enregistré.","es":"Archivo de copia guardado.","de":"Backup-Datei gespeichert.","pt":"Arquivo de backup salvo.","ru":"Файл резервной копии сохранён.","zh":"备份文件已保存。","ja":"バックアップ保存済み。","ko":"백업 파일 저장됨.","ar":"تم حفظ ملف النسخة الاحتياطية.","it":"File backup salvato.","tr":"Yedek dosya kaydedildi.","id":"File cadangan disimpan.","pl":"Plik kopii zapisany.","nl":"Backup bestand opgeslagen."},
    # Errors
    "err.name":           {"en":"Enter a name (1–7 alphanumeric).","fr":"Entrez un nom (1–7 caractères).","es":"Ingrese un nombre (1–7 alfanumérico).","de":"Name eingeben (1–7 alphanumerisch).","pt":"Digite um nome (1–7 alfanumérico).","ru":"Введите имя (1–7 символов).","zh":"请输入名称（1–7位字母数字）。","ja":"名前を入力 (1〜7英数字)。","ko":"이름을 입력하세요 (1~7 영숫자).","ar":"أدخل اسمًا (1–7 أحرف).","it":"Inserisci un nome (1–7 alfanumerico).","tr":"Ad girin (1–7 alfanümerik).","id":"Masukkan nama (1–7 alfanumerik).","pl":"Podaj nazwę (1–7 znaków).","nl":"Voer een naam in (1–7 alfanumeriek)."},
    "err.money":          {"en":"Money must be 0–2,147,483,647.","fr":"Argent entre 0 et 2 147 483 647.","es":"Dinero entre 0 y 2.147.483.647.","de":"Geld: 0–2.147.483.647.","pt":"Dinheiro: 0–2.147.483.647.","ru":"Деньги: 0–2 147 483 647.","zh":"金钱范围：0–2,147,483,647。","ja":"金額: 0〜2,147,483,647。","ko":"돈: 0~2,147,483,647.","ar":"المال بين 0 و 2,147,483,647.","it":"Denaro: 0–2.147.483.647.","tr":"Para: 0–2.147.483.647.","id":"Uang: 0–2.147.483.647.","pl":"Pieniądze: 0–2 147 483 647.","nl":"Geld: 0–2.147.483.647."},
}


class I18n:
    def __init__(self, lang: str = "en"):
        self.lang = lang if lang in LANGS else "en"

    def set(self, lang: str):
        self.lang = lang if lang in LANGS else "en"

    def t(self, key: str, **kwargs) -> str:
        entry = STRINGS.get(key, {})
        s = entry.get(self.lang) or entry.get("en") or key
        for k, v in kwargs.items():
            s = s.replace("{" + k + "}", str(v))
        return s


# ─────────────────────────────────────────────────────────────
# STYLED WIDGET HELPERS
# ─────────────────────────────────────────────────────────────

def styled_frame(parent, **kw):
    kw.setdefault("bg", Theme.BG_PANEL)
    kw.setdefault("relief", "flat")
    return tk.Frame(parent, **kw)


def styled_label(parent, text="", color=None, font=None, **kw):
    kw["bg"]   = kw.get("bg", Theme.BG_PANEL)
    kw["fg"]   = color or Theme.TEXT_MAIN
    kw["font"] = font or Theme.FONT_MONO
    return tk.Label(parent, text=text, **kw)


def styled_entry(parent, textvariable=None, width=20, **kw):
    kw.setdefault("bg",              Theme.BG_INPUT)
    kw.setdefault("fg",              Theme.LIME)
    kw.setdefault("insertbackground", Theme.LIME)
    kw.setdefault("relief",          "flat")
    kw.setdefault("font",            Theme.FONT_MONO)
    kw.setdefault("highlightthickness", 1)
    kw.setdefault("highlightbackground", Theme.BORDER_LIT)
    kw.setdefault("highlightcolor",  Theme.LIME)
    return tk.Entry(parent, textvariable=textvariable, width=width, **kw)


def styled_button(parent, text="", command=None, color=None, **kw):
    c = color or Theme.LIME
    btn = tk.Button(
        parent,
        text=text,
        command=command,
        bg=Theme.BG_CARD,
        fg=c,
        activebackground=Theme.BG_HOVER,
        activeforeground=c,
        relief="flat",
        font=Theme.FONT_MONO,
        cursor="hand2",
        highlightthickness=1,
        highlightbackground=Theme.BORDER_LIT,
        padx=8,
        pady=4,
        **kw,
    )
    return btn


def section_header(parent, text, bg=None):
    bg = bg or Theme.BG_PANEL
    f = tk.Frame(parent, bg=bg)
    tk.Label(f, text=text, fg=Theme.LIME, bg=bg,
             font=Theme.FONT_HEAD).pack(side="left")
    tk.Frame(f, bg=Theme.BORDER_LIT, height=1).pack(
        side="left", fill="x", expand=True, padx=(8, 0))
    return f


# ─────────────────────────────────────────────────────────────
# TOAST NOTIFICATION
# ─────────────────────────────────────────────────────────────

class Toast:
    """Floating label at bottom of window, auto-dismisses after 3 s."""

    def __init__(self, root: tk.Tk):
        self._root  = root
        self._label = tk.Label(
            root,
            text="",
            bg=Theme.BG_CARD,
            fg=Theme.LIME,
            font=Theme.FONT_MONO,
            padx=14,
            pady=6,
            relief="flat",
        )
        self._after_id = None

    def show(self, msg: str, kind: str = "ok"):
        colour = {
            "ok":  Theme.LIME,
            "err": Theme.RED,
            "info": Theme.GOLD,
        }.get(kind, Theme.LIME)
        self._label.config(text=msg, fg=colour)
        self._label.place(relx=0.5, rely=1.0, anchor="s", y=-10)
        if self._after_id:
            self._root.after_cancel(self._after_id)
        self._after_id = self._root.after(3000, self._hide)

    def _hide(self):
        self._label.place_forget()
        self._after_id = None


# ─────────────────────────────────────────────────────────────
# MAIN APPLICATION
# ─────────────────────────────────────────────────────────────

class App:

    SLOT_COUNT = 5

    def __init__(self, root: tk.Tk):
        self.root    = root
        self.editor  = SaveEditor()
        self.i18n    = I18n("en")
        self.toast   = Toast(root)

        # Track last directory used in dialogs
        self._last_dir = os.path.expanduser("~")

        # StringVars
        self._sv_name       = tk.StringVar()
        self._sv_money      = tk.StringVar()
        self._sv_clone_name = tk.StringVar()
        self._sv_new_name   = tk.StringVar()
        self._sv_new_money  = tk.StringVar(value="0")
        self._sv_lang       = tk.StringVar(value="en")
        self._sv_car        = tk.StringVar()
        self._bv_backup     = tk.BooleanVar(value=True)
        self._bv_new_parts  = tk.BooleanVar(value=False)

        self._slot_frames: list[tk.Frame] = []

        self._setup_window()
        self._build_ui()
        self._refresh_infobar()

    # ----------------------------------------------------------
    # WINDOW SETUP
    # ----------------------------------------------------------

    def _setup_window(self):
        self.root.title("NFSU2 Save Editor — Piererra Tools")
        self.root.configure(bg=Theme.BG_DEEP)
        self.root.resizable(True, True)
        self.root.minsize(720, 600)

        # Center on screen
        w, h = 860, 720
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        x  = (sw - w) // 2
        y  = (sh - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    # ----------------------------------------------------------
    # BUILD UI
    # ----------------------------------------------------------

    def _build_ui(self):
        self._build_header()

        # Scrollable content canvas
        outer = tk.Frame(self.root, bg=Theme.BG_DEEP)
        outer.pack(fill="both", expand=True)

        canvas = tk.Canvas(outer, bg=Theme.BG_DEEP, highlightthickness=0)
        vsb    = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        self._content = tk.Frame(canvas, bg=Theme.BG_DEEP)
        self._content_id = canvas.create_window(
            (0, 0), window=self._content, anchor="nw"
        )

        def _on_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))

        def _on_canvas_resize(e):
            canvas.itemconfig(self._content_id, width=e.width)

        self._content.bind("<Configure>", _on_configure)
        canvas.bind("<Configure>", _on_canvas_resize)

        # Mouse wheel scroll
        def _on_wheel(e):
            canvas.yview_scroll(int(-1 * (e.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", _on_wheel)

        pad = Theme.PAD
        self._build_file_section(self._content)
        self._build_infobar(self._content)
        self._build_profile_section(self._content)
        self._build_slot_section(self._content)
        self._build_cheats_section(self._content)
        self._build_clone_section(self._content)
        self._build_create_section(self._content)
        self._build_footer(self._content)

    # ----------------------------------------------------------
    # HEADER
    # ----------------------------------------------------------

    def _build_header(self):
        hdr = tk.Frame(self.root, bg=Theme.BG_PANEL,
                       highlightthickness=1,
                       highlightbackground=Theme.BORDER_LIT)
        hdr.pack(fill="x")

        left = tk.Frame(hdr, bg=Theme.BG_PANEL)
        left.pack(side="left", padx=Theme.PAD, pady=Theme.PAD)

        tk.Label(left,
                 text="NEED FOR SPEED UNDERGROUND 2",
                 fg=Theme.TEXT_MUTED, bg=Theme.BG_PANEL,
                 font=Theme.FONT_MONO_SM).pack(anchor="w")
        tk.Label(left,
                 text="Save Data Editor",
                 fg=Theme.LIME, bg=Theme.BG_PANEL,
                 font=Theme.FONT_TITLE).pack(anchor="w")
        tk.Label(left,
                 text="by Piererra",
                 fg=Theme.TEXT_MUTED, bg=Theme.BG_PANEL,
                 font=Theme.FONT_MONO_SM).pack(anchor="w")

        # Language selector (top-right)
        right = tk.Frame(hdr, bg=Theme.BG_PANEL)
        right.pack(side="right", padx=Theme.PAD, pady=Theme.PAD)

        tk.Label(right,
                 text=self.i18n.t("lang.label") + ":",
                 fg=Theme.TEXT_MUTED, bg=Theme.BG_PANEL,
                 font=Theme.FONT_MONO_SM).pack(side="left", padx=(0, 4))

        lang_keys   = list(LANGS.keys())
        lang_labels = [LANGS[k] for k in lang_keys]

        lang_cb = ttk.Combobox(
            right,
            textvariable=self._sv_lang,
            values=lang_labels,
            state="readonly",
            width=18,
            font=Theme.FONT_MONO_SM,
        )
        lang_cb.set(LANGS["en"])
        lang_cb.pack(side="left")
        lang_cb.bind("<<ComboboxSelected>>",
                     lambda e: self._on_lang_change(lang_keys, lang_cb))

        # Accent line
        tk.Frame(self.root, bg=Theme.LIME, height=1).pack(fill="x")

    # ----------------------------------------------------------
    # FILE SECTION
    # ----------------------------------------------------------

    def _build_file_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(Theme.PAD, 0))

        section_header(f, self.i18n.t("file.load")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        row = styled_frame(f)
        row.pack(fill="x")

        styled_button(row,
                      text="⬛  " + self.i18n.t("file.load"),
                      command=self._on_load,
                      color=Theme.LIME).pack(side="left", padx=(0, Theme.PAD_SM))

        styled_button(row,
                      text="⬛  " + self.i18n.t("file.save_bak"),
                      command=self._on_save_bak,
                      color=Theme.GOLD).pack(side="left")

        bak_cb = tk.Checkbutton(
            f,
            text=self.i18n.t("file.backup"),
            variable=self._bv_backup,
            bg=Theme.BG_PANEL,
            fg=Theme.TEXT_MUTED,
            selectcolor=Theme.BG_INPUT,
            activebackground=Theme.BG_PANEL,
            font=Theme.FONT_MONO_SM,
        )
        bak_cb.pack(anchor="w", pady=(Theme.PAD_SM, 0))

        # Separator
        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    # ----------------------------------------------------------
    # INFO BAR
    # ----------------------------------------------------------

    def _build_infobar(self, parent):
        bar = tk.Frame(parent, bg=Theme.BG_CARD,
                       highlightthickness=1,
                       highlightbackground=Theme.BORDER_LIT)
        bar.pack(fill="x", padx=Theme.PAD, pady=(0, Theme.PAD_SM))
        self._infobar = bar

        self._info_cells = {}
        keys = [
            ("info.profile", "—"),
            ("info.money",   "—"),
            ("info.slots",   "—"),
            ("info.header",  "—"),
            ("info.size",    "—"),
        ]
        for i, (k, val) in enumerate(keys):
            cell = tk.Frame(bar, bg=Theme.BG_CARD)
            cell.grid(row=0, column=i, padx=Theme.PAD, pady=Theme.PAD_SM, sticky="nsew")
            bar.columnconfigure(i, weight=1)

            lbl_key = tk.Label(cell, text=self.i18n.t(k),
                               fg=Theme.TEXT_MUTED, bg=Theme.BG_CARD,
                               font=Theme.FONT_MONO_SM)
            lbl_key.pack(anchor="w")

            lbl_val = tk.Label(cell, text=val,
                               fg=Theme.LIME, bg=Theme.BG_CARD,
                               font=Theme.FONT_MONO)
            lbl_val.pack(anchor="w")

            self._info_cells[k] = (lbl_key, lbl_val)

    # ----------------------------------------------------------
    # PROFILE SECTION
    # ----------------------------------------------------------

    def _build_profile_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(0, 0))

        section_header(f, self.i18n.t("sec.profile")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        # Name row
        name_row = styled_frame(f)
        name_row.pack(fill="x", pady=2)
        styled_label(name_row,
                     text=self.i18n.t("sec.name") + ":",
                     color=Theme.TEXT_MUTED,
                     font=Theme.FONT_MONO_SM,
                     width=16, anchor="w").pack(side="left")
        styled_entry(name_row, textvariable=self._sv_name, width=12).pack(side="left")
        styled_label(name_row,
                     text="  " + self.i18n.t("sec.name_hint"),
                     color=Theme.TEXT_MUTED,
                     font=Theme.FONT_MONO_SM).pack(side="left")

        # Money row
        money_row = styled_frame(f)
        money_row.pack(fill="x", pady=2)
        styled_label(money_row,
                     text=self.i18n.t("sec.money") + ":",
                     color=Theme.TEXT_MUTED,
                     font=Theme.FONT_MONO_SM,
                     width=16, anchor="w").pack(side="left")
        styled_entry(money_row, textvariable=self._sv_money, width=16).pack(side="left")
        styled_label(money_row,
                     text="  " + self.i18n.t("sec.money_hint"),
                     color=Theme.TEXT_MUTED,
                     font=Theme.FONT_MONO_SM).pack(side="left")

        # Apply button
        styled_button(f,
                      text=self.i18n.t("sec.apply"),
                      command=self._on_apply).pack(anchor="w", pady=(Theme.PAD_SM, 0))

        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    # ----------------------------------------------------------
    # CAR SLOTS SECTION
    # ----------------------------------------------------------

    def _build_slot_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(0, 0))

        section_header(f, self.i18n.t("sec.slots")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        self._slots_frame = styled_frame(f)
        self._slots_frame.pack(fill="x")
        self._render_slot_cards()

        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    def _render_slot_cards(self):
        # Clear old cards
        for w in self._slots_frame.winfo_children():
            w.destroy()

        for i in range(self.SLOT_COUNT):
            in_use = self.editor.is_slot_in_use(i) if self.editor.is_loaded() else False
            self._build_slot_card(self._slots_frame, i, in_use)

    def _build_slot_card(self, parent, slot_idx: int, in_use: bool):
        accent  = Theme.LIME if in_use else Theme.TEXT_MUTED
        border  = Theme.BORDER_LIT if in_use else Theme.BORDER

        card = tk.Frame(parent, bg=Theme.BG_CARD,
                        highlightthickness=1,
                        highlightbackground=border)
        card.pack(side="left", padx=(0, Theme.PAD_SM),
                  pady=(0, Theme.PAD_SM), ipadx=6, ipady=6)

        # Slot number
        tk.Label(card,
                 text=f"SLOT {slot_idx + 1:02d}",
                 fg=accent, bg=Theme.BG_CARD,
                 font=Theme.FONT_MONO).pack(anchor="w")

        # Status
        status_text = self.i18n.t("slot.in_use" if in_use else "slot.empty")
        tk.Label(card,
                 text=status_text,
                 fg=accent, bg=Theme.BG_CARD,
                 font=Theme.FONT_MONO_SM).pack(anchor="w", pady=(0, 4))

        # Buttons
        btn_row = tk.Frame(card, bg=Theme.BG_CARD)
        btn_row.pack(anchor="w")

        styled_button(btn_row,
                      text=self.i18n.t("slot.max"),
                      command=lambda s=slot_idx: self._on_slot_max(s),
                      color=Theme.LIME,
                      font=Theme.FONT_MONO_SM).pack(side="left", padx=(0, 2))

        styled_button(btn_row,
                      text=self.i18n.t("slot.nil"),
                      command=lambda s=slot_idx: self._on_slot_nil(s),
                      color=Theme.RED,
                      font=Theme.FONT_MONO_SM).pack(side="left", padx=(0, 2))

        unlock_btn = styled_button(btn_row,
                                   text=self.i18n.t("slot.unlock"),
                                   command=lambda s=slot_idx: self._on_slot_unlock(s),
                                   color=Theme.GOLD,
                                   font=Theme.FONT_MONO_SM)
        unlock_btn.pack(side="left")
        if in_use:
            unlock_btn.config(state="disabled", fg=Theme.TEXT_DIM)

    # ----------------------------------------------------------
    # CHEATS SECTION
    # ----------------------------------------------------------

    def _build_cheats_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(0, 0))

        section_header(f, self.i18n.t("sec.cheats")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        row = styled_frame(f)
        row.pack(anchor="w")

        styled_button(row,
                      text=self.i18n.t("cheat.max_money"),
                      command=self._on_max_money,
                      color=Theme.GOLD).pack(side="left", padx=(0, Theme.PAD_SM))

        styled_button(row,
                      text=self.i18n.t("cheat.unlock_slots"),
                      command=self._on_unlock_slots,
                      color=Theme.BLUE).pack(side="left", padx=(0, Theme.PAD_SM))

        styled_button(row,
                      text=self.i18n.t("cheat.unlock_parts"),
                      command=self._on_unlock_parts,
                      color=Theme.CYAN).pack(side="left")

        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    # ----------------------------------------------------------
    # CLONE SECTION
    # ----------------------------------------------------------

    def _build_clone_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(0, 0))

        section_header(f, self.i18n.t("sec.clone")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        row = styled_frame(f)
        row.pack(fill="x", pady=2)

        styled_label(row,
                     text=self.i18n.t("clone.new_name") + ":",
                     color=Theme.TEXT_MUTED,
                     font=Theme.FONT_MONO_SM,
                     width=18, anchor="w").pack(side="left")

        styled_entry(row, textvariable=self._sv_clone_name, width=12).pack(side="left")

        styled_button(row,
                      text=self.i18n.t("clone.btn"),
                      command=self._on_clone).pack(side="left", padx=(Theme.PAD_SM, 0))

        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    # ----------------------------------------------------------
    # CREATE NEW PROFILE SECTION
    # ----------------------------------------------------------

    def _build_create_section(self, parent):
        f = styled_frame(parent)
        f.pack(fill="x", padx=Theme.PAD, pady=(0, 0))

        section_header(f, self.i18n.t("sec.create")).pack(
            fill="x", pady=(0, Theme.PAD_SM))

        # Name
        r1 = styled_frame(f)
        r1.pack(fill="x", pady=2)
        styled_label(r1, text=self.i18n.t("create.name") + ":",
                     color=Theme.TEXT_MUTED, font=Theme.FONT_MONO_SM,
                     width=18, anchor="w").pack(side="left")
        styled_entry(r1, textvariable=self._sv_new_name, width=12).pack(side="left")
        styled_label(r1, text="  " + self.i18n.t("sec.name_hint"),
                     color=Theme.TEXT_MUTED, font=Theme.FONT_MONO_SM).pack(side="left")

        # Money
        r2 = styled_frame(f)
        r2.pack(fill="x", pady=2)
        styled_label(r2, text=self.i18n.t("create.money") + ":",
                     color=Theme.TEXT_MUTED, font=Theme.FONT_MONO_SM,
                     width=18, anchor="w").pack(side="left")
        styled_entry(r2, textvariable=self._sv_new_money, width=16).pack(side="left")

        # Car selector
        r3 = styled_frame(f)
        r3.pack(fill="x", pady=2)
        styled_label(r3, text=self.i18n.t("create.car") + ":",
                     color=Theme.TEXT_MUTED, font=Theme.FONT_MONO_SM,
                     width=18, anchor="w").pack(side="left")

        car_names   = get_car_names()
        car_display = [self.i18n.t("create.car_default")] + [n for _, n in car_names]
        self._car_keys = [""] + [k for k, _ in car_names]

        self._car_combo = ttk.Combobox(
            r3,
            textvariable=self._sv_car,
            values=car_display,
            state="readonly",
            width=30,
            font=Theme.FONT_MONO_SM,
        )
        self._car_combo.current(0)
        self._car_combo.pack(side="left")

        # Unlock parts checkbox
        r4 = styled_frame(f)
        r4.pack(anchor="w", pady=2)
        tk.Checkbutton(
            r4,
            text=self.i18n.t("create.unlock_parts"),
            variable=self._bv_new_parts,
            bg=Theme.BG_PANEL,
            fg=Theme.TEXT_MUTED,
            selectcolor=Theme.BG_INPUT,
            activebackground=Theme.BG_PANEL,
            font=Theme.FONT_MONO_SM,
        ).pack(side="left")

        # Create button
        styled_button(f,
                      text=self.i18n.t("create.btn"),
                      command=self._on_create).pack(anchor="w", pady=(Theme.PAD_SM, 0))

        tk.Frame(parent, bg=Theme.BORDER, height=1).pack(
            fill="x", padx=Theme.PAD, pady=Theme.PAD_SM)

    # ----------------------------------------------------------
    # FOOTER
    # ----------------------------------------------------------

    def _build_footer(self, parent):
        ft = styled_frame(parent, bg=Theme.BG_DEEP)
        ft.pack(fill="x", pady=(0, Theme.PAD))
        tk.Label(ft,
                 text="PIERERRA TOOLS  ·  NFSU2 Save Editor  ·  discord.com/users/1413503870373462070",
                 fg=Theme.TEXT_MUTED, bg=Theme.BG_DEEP,
                 font=Theme.FONT_MONO_SM).pack()

    # ----------------------------------------------------------
    # REFRESH HELPERS
    # ----------------------------------------------------------

    def _refresh_infobar(self):
        info = self.editor.get_save_info() if self.editor.is_loaded() else None

        vals = {
            "info.profile": info["name"]    if info else "—",
            "info.money":   f'{info["money"]:,}'  if info else "—",
            "info.slots":   f'{info["slots"]["in_use"]}/{info["slots"]["total"]}' if info else "—",
            "info.header":  (self.i18n.t("info.valid") if info["header_ok"]
                             else self.i18n.t("info.invalid")) if info else "—",
            "info.size":    f'{info["size"]:,} B' if info else "—",
        }
        colors = {
            "info.header": (Theme.LIME if (info and info["header_ok"]) else Theme.RED)
                           if info else Theme.TEXT_MUTED,
        }
        for k, (lbl_key, lbl_val) in self._info_cells.items():
            lbl_key.config(text=self.i18n.t(k))
            lbl_val.config(text=vals[k],
                           fg=colors.get(k, Theme.LIME if info else Theme.TEXT_MUTED))

    def _refresh_fields(self):
        if not self.editor.is_loaded():
            return
        info = self.editor.get_save_info()
        self._sv_name.set(info["name"])
        self._sv_money.set(str(info["money"]))

    # ----------------------------------------------------------
    # LANGUAGE CHANGE
    # ----------------------------------------------------------

    def _on_lang_change(self, lang_keys, combo):
        selected_label = self._sv_lang.get()
        lang_labels    = [LANGS[k] for k in lang_keys]
        try:
            idx = lang_labels.index(selected_label)
        except ValueError:
            return
        self.i18n.set(lang_keys[idx])
        # Rebuild UI to reflect new language
        self._rebuild_ui()

    def _rebuild_ui(self):
        # Destroy and re-render content area only
        for w in self._content.winfo_children():
            w.destroy()
        self._info_cells    = {}
        self._slot_frames   = []
        self._build_file_section(self._content)
        self._build_infobar(self._content)
        self._build_profile_section(self._content)
        self._build_slot_section(self._content)
        self._build_cheats_section(self._content)
        self._build_clone_section(self._content)
        self._build_create_section(self._content)
        self._build_footer(self._content)
        self._refresh_infobar()
        if self.editor.is_loaded():
            self._refresh_fields()

    # ----------------------------------------------------------
    # EVENT HANDLERS
    # ----------------------------------------------------------

    def _on_load(self):
        path = filedialog.askopenfilename(
            title="Open NFSU2 Save File",
            initialdir=self._last_dir,
            filetypes=[("NFSU2 Save Files", "*"),
                       ("All Files", "*.*")],
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)

        try:
            self.editor.load_save(path)
        except Exception as e:
            self.toast.show(str(e), "err")
            return

        fname = os.path.basename(path)

        # Auto-backup
        if self._bv_backup.get():
            bak_path = path + ".bak"
            try:
                self.editor.download_backup(bak_path)
            except Exception:
                pass

        self._refresh_infobar()
        self._refresh_fields()
        self._render_slot_cards()
        self.toast.show(self.i18n.t("toast.loaded", f=fname), "ok")

    def _on_save_bak(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        path = filedialog.asksaveasfilename(
            title="Save Backup",
            initialdir=self._last_dir,
            defaultextension=".bak",
            filetypes=[("Backup", "*.bak"), ("All Files", "*.*")],
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)
        try:
            self.editor.download_backup(path)
            self.toast.show(self.i18n.t("toast.bak_saved"), "ok")
        except Exception as e:
            self.toast.show(str(e), "err")

    def _on_apply(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return

        name = self._sv_name.get().strip()
        if not name:
            self.toast.show(self.i18n.t("err.name"), "err")
            return

        try:
            money = int(self._sv_money.get().replace(",", "").strip())
        except ValueError:
            self.toast.show(self.i18n.t("err.money"), "err")
            return

        self.editor.set_name(name)
        self.editor.set_money(money)

        path = filedialog.asksaveasfilename(
            title="Save Modified File",
            initialdir=self._last_dir,
            initialfile=name,
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)
        try:
            self.editor.download_save(path)
            self._refresh_infobar()
            self.toast.show(self.i18n.t("toast.applied"), "ok")
        except Exception as e:
            self.toast.show(str(e), "err")

    def _on_slot_max(self, slot_idx: int):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.set_slot_perf(slot_idx, "max")
        self.toast.show(self.i18n.t("toast.slot_maxed", n=slot_idx + 1), "ok")

    def _on_slot_nil(self, slot_idx: int):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.set_slot_perf(slot_idx, "nil")
        self.toast.show(self.i18n.t("toast.slot_zeroed", n=slot_idx + 1), "ok")

    def _on_slot_unlock(self, slot_idx: int):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.unlock_slot(slot_idx)
        self._render_slot_cards()
        self._refresh_infobar()
        self.toast.show(self.i18n.t("toast.slot_unlocked", n=slot_idx + 1), "ok")

    def _on_max_money(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.max_money()
        self._sv_money.set("2147483647")
        self._refresh_infobar()
        self.toast.show(self.i18n.t("toast.money_maxed"), "ok")

    def _on_unlock_slots(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.unlock_all_slots()
        self._render_slot_cards()
        self._refresh_infobar()
        self.toast.show(self.i18n.t("toast.slots_unlocked"), "ok")

    def _on_unlock_parts(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        self.editor.unlock_all_parts()
        self.toast.show(self.i18n.t("toast.parts_unlocked"), "ok")

    def _on_clone(self):
        if not self.editor.is_loaded():
            self.toast.show(self.i18n.t("toast.no_save"), "err")
            return
        name = self._sv_clone_name.get().strip()
        if not name:
            self.toast.show(self.i18n.t("err.name"), "err")
            return
        path = filedialog.asksaveasfilename(
            title="Save Cloned File",
            initialdir=self._last_dir,
            initialfile=name,
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)
        try:
            self.editor.clone_save(name, path)
            self.toast.show(self.i18n.t("toast.cloned", n=name), "ok")
        except Exception as e:
            self.toast.show(str(e), "err")

    def _on_create(self):
        name = self._sv_new_name.get().strip()
        if not name:
            self.toast.show(self.i18n.t("err.name"), "err")
            return
        try:
            money = int(self._sv_new_money.get().replace(",", "").strip() or "0")
        except ValueError:
            self.toast.show(self.i18n.t("err.money"), "err")
            return

        car_idx = self._car_combo.current()
        car_key = self._car_keys[car_idx] if car_idx >= 0 else ""

        path = filedialog.asksaveasfilename(
            title="Save New Profile",
            initialdir=self._last_dir,
            initialfile=name,
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)
        try:
            self.editor.create_profile(
                name=name,
                money=money,
                car_key=car_key,
                unlock_parts=self._bv_new_parts.get(),
                out_path=path,
            )
            self.toast.show(self.i18n.t("toast.created", n=name), "ok")
        except Exception as e:
            self.toast.show(str(e), "err")
