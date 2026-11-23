/* maker-inventory web app. Same code runs live (`node inv.mjs app`) and as a read-only snapshot (overview.html). */
(() => {
"use strict";

const BOOT = window.__BOOT__ || { mode: "snapshot", data: { items: [], projects: [] } };
const LIVE = BOOT.mode === "live";
const FILES = ["filament", "electronics", "hardware", "consumables", "tools"];

// ---------------------------------------------------------------- i18n
const I18N = {
  en: {
    "app.sub": "Parts, filament & projects", "nav.workspace": "Workspace", "nav.inventory": "Inventory",
    "nav.dashboard": "Overview", "nav.projects": "Projects",
    "file.filament": "Filament", "file.electronics": "Electronics", "file.hardware": "Hardware", "file.consumables": "Consumables", "file.tools": "Tools",
    "search": "Search everything…", "add": "Add item", "results": "Search results",
    "live": "Live · saves to YAML", "snapshot": "Read-only snapshot", "updated": "Updated {t}",
    "ro.banner": "This is a read-only snapshot. To add and edit items, run", "lang": "Language", "theme": "Theme",
    "theme.auto": "Auto", "theme.light": "Light", "theme.dark": "Dark",
    "kpi.items": "Items", "kpi.filament": "Filament on hand", "kpi.low": "Below minimum", "kpi.unverified": "Not verified", "kpi.tobuy": "To buy for projects",
    "attn.title": "Needs attention", "attn.none": "Nothing needs attention. 🎉", "attn.low": "below min {n}", "attn.unverified": "not verified", "attn.inuse": "in use: {p}",
    "fil.title": "Filament", "fil.none": "No filament yet.", "proj.title": "Projects", "proj.none": "No projects yet.",
    "proj.hint": "Projects are YAML files in {dir}. Ask an agent: “check if I have everything for …”, or copy {ex}.",
    "proj.ready": "{a}/{b} ready", "proj.short": "{n} short", "proj.missing": "{n} missing", "proj.example": "example",
    "proj.need": "Need", "proj.qty": "Qty", "proj.have": "Have", "proj.from": "From stock", "proj.notes": "Notes",
    "proj.needsTitle": "What it needs", "ps.label": "Status", "ps.none": "No status", "ps.idea": "Idea", "ps.planning": "Planning", "ps.building": "Building", "ps.done": "Done", "ps.paused": "Paused", "pl.todo": "To do", "pl.todo.ph": "Add a task and press Enter", "pl.todo.none": "No tasks yet.", "pl.links": "Links", "pl.link.title": "Title (optional)", "pl.links.none": "No links yet: the CAD model, a guide, a shop page …", "pl.badUrl": "Links must start with http:// or https://", "pl.add": "Add", "pl.remove": "Remove", "pl.images": "Pictures", "pl.images.add": "Add pictures", "pl.images.none": "Drop pictures here, paste one with Ctrl+V or click Add pictures. PNG, JPG, WebP or GIF up to 8 MB.", "pl.images.empty": "No pictures.", "pl.images.big": "{n} is larger than 8 MB", "pl.images.type": "{n} is not a PNG, JPG, WebP or GIF", "pl.images.added": "Pictures added: {n}", "pl.caption": "Caption", "pl.caption.ph": "Add a caption", "pl.delete": "Delete picture", "pl.confirm": "Click again to delete", "pl.prev": "Previous", "pl.next": "Next",
    "f.cad": "CAD component", "f.cad.hint": "Id of a file in the CAD library. The dimensions below are read from it.", "cad.title": "CAD dimensions", "cad.none": "No CAD dimensions yet.", "cad.nofile": "There is no {id}.yaml in {dir}.", "cad.suggest": "{id}.yaml lists this item.", "cad.use": "Link it", "cad.dim": "Dimension", "cad.value": "Value", "cad.src": "Source", "cad.ref": "Ref", "cad.confirm": "Measure on your own part if a check asks:", "cad.count": "{n} dimensions · {file}", "cad.readonly": "Read-only here. Edit the library file to change them.", "cad.error": "Could not read {file}: {e}", "cad.missing": "No CAD dimensions", "cad.frame": "Coordinate system", "cad.about": "About these values", "cad.other": "Other", "src.MEASURED": "Measured on the real part", "src.DRAWING": "From a dimensioned drawing or board file", "src.DATASHEET": "From the datasheet", "src.STEP": "From a manufacturer 3D model", "src.DISTRIBUTOR": "From a shop or distributor page", "src.COMMUNITY": "Common value from the community, not verified", "src.SCALED": "Measured off a picture", "src.ASSUMED": "Guess", "st.cad": "CAD library", "st.cad.hint": "Dimension files for bought parts, linked from items with cad_component. Set MAKER_CAD_LIBRARY to use another folder.", "st.cad.count": "{n} component files · {l} linked items", "st.cad.warn": "{n} warnings", "st.cad.nodir": "Folder not found", "st.cad.show": "Items without CAD dimensions",
    "proj.shop": "Shopping list", "proj.copy": "Copy as Markdown", "proj.copied": "Shopping list copied", "proj.nothing": "Nothing to buy. You have everything.",
    "proj.optional": "optional", "proj.altHead": "Similar in stock · {why}", "proj.altToggle": "{n} similar", "proj.altMissing": "no {key}", "why.other color": "other color", "why.other specs": "other sizes",
    "why.same category": "same category", "why.other finish/brand": "other finish/brand", "proj.inuse": "in use in {p}",
    "col.name": "Name", "col.category": "Category", "col.tags": "Tags", "col.specs": "Specs", "col.location": "Location", "col.qty": "Qty",
    "col.status": "Status", "col.section": "Section", "col.color": "Filament", "col.finish": "Finish", "col.brand": "Brand", "col.grams": "Left", "col.spools": "Spools",
    "all": "All", "attention": "Needs attention", "count": "{n} of {total} items", "no.rows": "No items match.",
    "empty.title": "Your inventory is empty", "empty.text": "Add what you have at home (filament, boards, sensors, screws) and agents can tell you what a project still needs.",
    "empty.cta": "Add your first item", "empty.file": "Nothing in {f} yet.",
    "b.unverified": "not verified", "b.low": "low", "b.inuse": "in use: {p}",
    "d.new": "New item", "d.edit": "Edit item", "d.view": "Item", "d.save": "Save", "d.cancel": "Cancel", "d.close": "Close", "d.delete": "Delete", "d.confirm": "Click again to delete",
    "f.basics": "Basics", "f.stock": "Stock", "f.details": "Details", "f.name": "Name", "f.name.auto": "Leave empty to use material + color.", "f.id": "ID", "f.id.hint": "Unique, kebab-case. Projects refer to it.",
    "f.section": "Section", "f.category": "Category", "f.material": "Material", "f.color": "Color", "f.finish": "Finish", "f.brand": "Brand",
    "f.qty": "Quantity", "f.grams": "Grams left", "f.unit": "Unit", "f.spools": "Spools", "f.min": "Warn below", "f.location": "Location",
    "f.inuse": "Built into project", "f.inuse.hint": "Still counts as owned, but is flagged in checks.", "f.verified": "Verified: I have checked this in the drawer",
    "f.tags": "Tags", "f.tags.hint": "Press Enter or comma to add. Used by agents to match parts (e.g. 5v, i2c).",
    "f.specs": "Specs", "f.spec.key": "key (e.g. voltage)", "f.spec.val": "value", "f.spec.add": "Add spec", "f.notes": "Notes", "f.source": "Source",
    "t.saved": "Saved", "t.added": "Added {n}", "t.deleted": "Deleted {n}", "t.conflict": "The file was changed elsewhere (an agent?). Reloaded — check and save again.",
    "t.reloaded": "Updated from disk", "t.error": "Could not save: {e}", "t.offline": "Lost connection to the app server",
    "a.dec": "Decrease", "a.inc": "Increase", "a.remove": "Remove", "nav.settings": "Settings", "proj.new": "New project", "proj.fromExample": "Start from example", "proj.empty": "List what a build needs and see at a glance what you already have and what to buy.", "proj.agentHint": "You can also ask an agent: “check if I have everything for …”.", "proj.edit": "Edit", "proj.build": "Mark as built", "proj.build.hint": "Take the parts this project uses out of stock", "proj.restock": "Add to stock", "proj.restock.hint": "Bought it? Add it to your inventory", "proj.noNeeds": "No needs yet. Click Edit to list what this project needs.", "pe.new": "New project", "pe.edit": "Edit project", "pe.name": "Project name", "pe.name.ph": "e.g. Vending machine v12", "pe.notes.ph": "Optional: version, link to the design …", "pe.needs": "What it needs", "pe.needs.hint": "One row per part. “Any matching” finds anything in stock that fits (e.g. any 5V microcontroller); “Specific item” points at one thing you own.", "pe.mode.match": "Any matching", "pe.mode.item": "Specific item", "pe.remove": "Remove need", "pe.what": "What", "pe.what.ph": "e.g. Microcontroller", "pe.item": "Item from your inventory", "pe.item.hint": "Missing from the list? Use “Any matching” and describe it instead.", "pe.pick": "Pick an item…", "pe.anySection": "Any section", "pe.tags": "Must have tags", "pe.tags.ph": "e.g. 5v, i2c", "pe.specs": "Must have specs", "pe.specs.ph": "e.g. thread=M3, length=10", "pe.optional": "Optional (nice to have)", "pe.more": "Note & where to buy", "pe.text": "Name contains", "pe.text.ph": "e.g. uno", "pe.where": "Where to buy", "pe.price": "Est. price", "pe.link": "Link", "pe.add": "Add need", "pe.created": "Created {n}", "bd.title": "Built: {n}", "bd.intro": "Record that you built this project. Choose what happens to the parts it used.", "bd.deduct": "Use up the parts", "bd.deduct.hint": "Subtract the quantities from stock (filament, screws, components).", "bd.inuse": "Mark them as built in", "bd.inuse.hint": "Keep them in stock but flag them as in use in “{p}”.", "bd.parts": "Parts", "bd.none": "Nothing from your stock is allocated to this project.", "bd.confirm": "Confirm", "bd.done.deduct": "Stock updated ({n} items)", "bd.done.inuse": "Marked {n} items as in use", "st.appearance": "Appearance", "st.data": "Data", "st.dataDir": "Data folder", "st.dataDir.hint": "Your YAML files. Set MAKER_INVENTORY_DIR before starting the app to use another folder.", "st.copy": "Copy", "st.copied": "Copied", "stale": "The app server is older than this page, so colors and translations are wrong. Stop it (Ctrl+C) and run node inv.mjs app again.", "st.check": "Check data", "st.check.hint": "Finds duplicate ids, missing fields and bad quantities.", "st.check.run": "Run check", "st.check.ok": "All good · {n} items", "st.snapshot": "Read-only snapshot", "st.snapshot.hint": "A single HTML file you can open without the app. Updated on every save.", "st.snapshot.run": "Rebuild now", "st.snapshot.done": "Snapshot rebuilt", "st.ai": "AI agents (Claude Code)", "st.ai.intro": "Optional. Installs a skill so agents in any project folder can check this inventory and update it when you tell them.", "st.skill": "Inventory skill", "st.skill.ok": "Installed", "st.skill.missing": "Not installed", "st.skill.other": "Points to another folder", "st.skill.install": "Install", "st.skill.update": "Reinstall", "st.skill.done": "Skill installed", "st.keys": "Keyboard shortcuts", "st.key.search": "Search", "st.key.new": "New item / project", "st.key.save": "Save", "st.key.close": "Close panel",
    "unsaved": "Discard unsaved changes?",
  },
  sv: {
    "app.sub": "Delar, filament & projekt", "nav.workspace": "Arbetsyta", "nav.inventory": "Lager",
    "nav.dashboard": "Översikt", "nav.projects": "Projekt",
    "file.filament": "Filament", "file.electronics": "Elektronik", "file.hardware": "Mekanik", "file.consumables": "Förbrukning", "file.tools": "Verktyg",
    "search": "Sök i allt…", "add": "Lägg till", "results": "Sökresultat",
    "live": "Live · sparar till YAML", "snapshot": "Skrivskyddad ögonblicksbild", "updated": "Uppdaterad {t}",
    "ro.banner": "Det här är en skrivskyddad ögonblicksbild. För att lägga till och ändra, kör", "lang": "Språk", "theme": "Tema",
    "theme.auto": "Auto", "theme.light": "Ljust", "theme.dark": "Mörkt",
    "kpi.items": "Poster", "kpi.filament": "Filament hemma", "kpi.low": "Under miniminivå", "kpi.unverified": "Ej verifierade", "kpi.tobuy": "Att köpa till projekt",
    "attn.title": "Behöver kollas", "attn.none": "Inget behöver kollas. 🎉", "attn.low": "under min {n}", "attn.unverified": "ej verifierad", "attn.inuse": "sitter i {p}",
    "fil.title": "Filament", "fil.none": "Inget filament än.", "proj.title": "Projekt", "proj.none": "Inga projekt än.",
    "proj.hint": "Projekt är YAML-filer i {dir}. Fråga en agent: ”kolla om jag har allt för …”, eller kopiera {ex}.",
    "proj.ready": "{a}/{b} klart", "proj.short": "{n} räcker inte", "proj.missing": "{n} saknas", "proj.example": "exempel",
    "proj.need": "Behov", "proj.qty": "Antal", "proj.have": "Hemma", "proj.from": "Från lagret", "proj.notes": "Noteringar",
    "proj.needsTitle": "Vad som behövs", "ps.label": "Status", "ps.none": "Ingen status", "ps.idea": "Idé", "ps.planning": "Planering", "ps.building": "Bygger", "ps.done": "Klar", "ps.paused": "Pausad", "pl.todo": "Att göra", "pl.todo.ph": "Skriv en uppgift och tryck Enter", "pl.todo.none": "Inga uppgifter än.", "pl.links": "Länkar", "pl.link.title": "Titel (valfri)", "pl.links.none": "Inga länkar än: CAD-modellen, en guide, en butikssida …", "pl.badUrl": "Länkar måste börja med http:// eller https://", "pl.add": "Lägg till", "pl.remove": "Ta bort", "pl.images": "Bilder", "pl.images.add": "Lägg till bilder", "pl.images.none": "Släpp bilder här, klistra in en med Ctrl+V eller klicka Lägg till bilder. PNG, JPG, WebP eller GIF upp till 8 MB.", "pl.images.empty": "Inga bilder.", "pl.images.big": "{n} är större än 8 MB", "pl.images.type": "{n} är inte PNG, JPG, WebP eller GIF", "pl.images.added": "Bilder tillagda: {n}", "pl.caption": "Bildtext", "pl.caption.ph": "Skriv en bildtext", "pl.delete": "Ta bort bilden", "pl.confirm": "Klicka igen för att ta bort", "pl.prev": "Föregående", "pl.next": "Nästa",
    "f.cad": "CAD-komponent", "f.cad.hint": "Id för en fil i CAD-biblioteket. Måtten nedan läses därifrån.", "cad.title": "CAD-mått", "cad.none": "Inga CAD-mått än.", "cad.nofile": "Det finns ingen {id}.yaml i {dir}.", "cad.suggest": "{id}.yaml nämner den här artikeln.", "cad.use": "Koppla", "cad.dim": "Mått", "cad.value": "Värde", "cad.src": "Källa", "cad.ref": "Ref", "cad.confirm": "Mät på ditt eget exemplar om en kontroll frågar efter det:", "cad.count": "{n} mått · {file}", "cad.readonly": "Skrivskyddat här. Ändra i biblioteksfilen för att ändra dem.", "cad.error": "Kunde inte läsa {file}: {e}", "cad.missing": "Utan CAD-mått", "cad.frame": "Koordinatsystem", "cad.about": "Om värdena", "cad.other": "Övrigt", "src.MEASURED": "Uppmätt på den riktiga delen", "src.DRAWING": "Från en måttsatt ritning eller kortfil", "src.DATASHEET": "Från databladet", "src.STEP": "Från tillverkarens 3D-modell", "src.DISTRIBUTOR": "Från en butiks- eller återförsäljarsida", "src.COMMUNITY": "Vanligt värde från andra, inte kontrollerat", "src.SCALED": "Uppmätt på en bild", "src.ASSUMED": "Gissning", "st.cad": "CAD-bibliotek", "st.cad.hint": "Måttfiler för köpta delar, som artiklar kopplas till med cad_component. Sätt MAKER_CAD_LIBRARY för att använda en annan mapp.", "st.cad.count": "{n} komponentfiler · {l} kopplade artiklar", "st.cad.warn": "{n} varningar", "st.cad.nodir": "Mappen finns inte", "st.cad.show": "Artiklar utan CAD-mått",
    "proj.shop": "Inköpslista", "proj.copy": "Kopiera som Markdown", "proj.copied": "Inköpslistan kopierad", "proj.nothing": "Inget att köpa. Du har allt.",
    "proj.optional": "valfri", "proj.altHead": "Liknande i lager · {why}", "proj.altToggle": "{n} liknande", "proj.altMissing": "saknar {key}", "why.other color": "annan färg", "why.other specs": "andra mått",
    "why.same category": "samma kategori", "why.other finish/brand": "annan finish/märke", "proj.inuse": "sitter i {p}",
    "col.name": "Namn", "col.category": "Kategori", "col.tags": "Taggar", "col.specs": "Specs", "col.location": "Plats", "col.qty": "Antal",
    "col.status": "Status", "col.section": "Sektion", "col.color": "Filament", "col.finish": "Finish", "col.brand": "Märke", "col.grams": "Kvar", "col.spools": "Rullar",
    "all": "Alla", "attention": "Behöver kollas", "count": "{n} av {total} poster", "no.rows": "Inga poster matchar.",
    "empty.title": "Ditt lager är tomt", "empty.text": "Lägg in det du har hemma (filament, kort, sensorer, skruv) så kan agenter säga vad ett projekt saknar.",
    "empty.cta": "Lägg till första posten", "empty.file": "Inget i {f} än.",
    "b.unverified": "ej verifierad", "b.low": "lågt", "b.inuse": "sitter i {p}",
    "d.new": "Ny post", "d.edit": "Ändra post", "d.view": "Post", "d.save": "Spara", "d.cancel": "Avbryt", "d.close": "Stäng", "d.delete": "Ta bort", "d.confirm": "Klicka igen för att ta bort",
    "f.basics": "Grundinfo", "f.stock": "Lager", "f.details": "Detaljer", "f.name": "Namn", "f.name.auto": "Lämna tomt för material + färg.", "f.id": "ID", "f.id.hint": "Unikt, kebab-case. Projekt pekar på det.",
    "f.section": "Sektion", "f.category": "Kategori", "f.material": "Material", "f.color": "Färg", "f.finish": "Finish", "f.brand": "Märke",
    "f.qty": "Antal", "f.grams": "Gram kvar", "f.unit": "Enhet", "f.spools": "Rullar", "f.min": "Varna under", "f.location": "Plats",
    "f.inuse": "Monterad i projekt", "f.inuse.hint": "Räknas som ägd, men flaggas i kontroller.", "f.verified": "Verifierad: jag har kollat i lådan",
    "f.tags": "Taggar", "f.tags.hint": "Enter eller komma för att lägga till. Agenter matchar delar på dem (t.ex. 5v, i2c).",
    "f.specs": "Specs", "f.spec.key": "nyckel (t.ex. spänning)", "f.spec.val": "värde", "f.spec.add": "Lägg till spec", "f.notes": "Anteckningar", "f.source": "Källa",
    "t.saved": "Sparat", "t.added": "Lade till {n}", "t.deleted": "Tog bort {n}", "t.conflict": "Filen ändrades någon annanstans (en agent?). Laddade om – kolla och spara igen.",
    "t.reloaded": "Uppdaterat från disk", "t.error": "Kunde inte spara: {e}", "t.offline": "Tappade kontakten med app-servern",
    "a.dec": "Minska", "a.inc": "Öka", "a.remove": "Ta bort", "nav.settings": "Inställningar", "proj.new": "Nytt projekt", "proj.fromExample": "Utgå från exempel", "proj.empty": "Lista vad ett bygge behöver och se direkt vad du redan har och vad du måste köpa.", "proj.agentHint": "Du kan också fråga en agent: ”kolla om jag har allt för …”.", "proj.edit": "Ändra", "proj.build": "Markera som byggt", "proj.build.hint": "Ta delarna projektet använder ur lagret", "proj.restock": "Lägg in i lagret", "proj.restock.hint": "Köpt? Lägg in det i lagret", "proj.noNeeds": "Inga behov än. Klicka Ändra för att lista vad projektet behöver.", "pe.new": "Nytt projekt", "pe.edit": "Ändra projekt", "pe.name": "Projektnamn", "pe.name.ph": "t.ex. Godisautomat v12", "pe.notes.ph": "Valfritt: version, länk till ritningen …", "pe.needs": "Vad det behöver", "pe.needs.hint": "En rad per del. ”Valfri som matchar” hittar allt i lagret som passar (t.ex. valfri 5V-mikrokontroller); ”Specifik post” pekar på en sak du har.", "pe.mode.match": "Valfri som matchar", "pe.mode.item": "Specifik post", "pe.remove": "Ta bort behov", "pe.what": "Vad", "pe.what.ph": "t.ex. Mikrokontroller", "pe.item": "Post i lagret", "pe.item.hint": "Saknas den i listan? Välj ”Valfri som matchar” och beskriv den i stället.", "pe.pick": "Välj en post…", "pe.anySection": "Valfri sektion", "pe.tags": "Måste ha taggar", "pe.tags.ph": "t.ex. 5v, i2c", "pe.specs": "Måste ha specs", "pe.specs.ph": "t.ex. gänga=M3, längd=10", "pe.optional": "Valfri (bra att ha)", "pe.more": "Anteckning & var man köper", "pe.text": "Namnet innehåller", "pe.text.ph": "t.ex. uno", "pe.where": "Var man köper", "pe.price": "Ungefärligt pris", "pe.link": "Länk", "pe.add": "Lägg till behov", "pe.created": "Skapade {n}", "bd.title": "Byggt: {n}", "bd.intro": "Registrera att du har byggt projektet. Välj vad som händer med delarna det använde.", "bd.deduct": "Förbruka delarna", "bd.deduct.hint": "Dra av antalen från lagret (filament, skruv, komponenter).", "bd.inuse": "Markera som monterade i", "bd.inuse.hint": "Behåll dem i lagret men flagga dem som monterade i ”{p}”.", "bd.parts": "Delar", "bd.none": "Inget från lagret är kopplat till projektet.", "bd.confirm": "Bekräfta", "bd.done.deduct": "Lagret uppdaterat ({n} poster)", "bd.done.inuse": "Markerade {n} poster som monterade", "st.appearance": "Utseende", "st.data": "Data", "st.dataDir": "Datamapp", "st.dataDir.hint": "Dina YAML-filer. Sätt MAKER_INVENTORY_DIR innan du startar appen för att använda en annan mapp.", "st.copy": "Kopiera", "st.copied": "Kopierat", "stale": "Appservern är äldre än sidan, så färger och översättningar blir fel. Stoppa den (Ctrl+C) och kör node inv.mjs app igen.", "st.check": "Kontrollera data", "st.check.hint": "Hittar dubbla id:n, saknade fält och felaktiga antal.", "st.check.run": "Kör kontroll", "st.check.ok": "Allt ok · {n} poster", "st.snapshot": "Skrivskyddad ögonblicksbild", "st.snapshot.hint": "En enda HTML-fil du kan öppna utan appen. Uppdateras vid varje sparning.", "st.snapshot.run": "Bygg om nu", "st.snapshot.done": "Ögonblicksbilden ombyggd", "st.ai": "AI-agenter (Claude Code)", "st.ai.intro": "Valfritt. Installerar en skill så att agenter i vilken projektmapp som helst kan kolla lagret och uppdatera det när du ber dem.", "st.skill": "Inventory-skill", "st.skill.ok": "Installerad", "st.skill.missing": "Inte installerad", "st.skill.other": "Pekar på en annan mapp", "st.skill.install": "Installera", "st.skill.update": "Installera om", "st.skill.done": "Skill installerad", "st.keys": "Kortkommandon", "st.key.search": "Sök", "st.key.new": "Ny post / nytt projekt", "st.key.save": "Spara", "st.key.close": "Stäng panelen",
    "unsaved": "Släng osparade ändringar?",
  },
};
const store = {
  get(k) { try { return localStorage.getItem("mi." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("mi." + k, v); } catch { /* private mode */ } },
};
let lang = store.get("lang") || ((navigator.language || "").toLowerCase().startsWith("sv") ? "sv" : "en");
const t = (k, vars = {}) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
const fileLabel = (f) => I18N[lang]["file." + f] ? t("file." + f) : f;
// ---------------------------------------------------------------- vocabulary
// Data stores canonical keys (English); the UI shows them in the chosen language and accepts either.
const VOCAB = window.__VOCAB__ || { colors: {}, finishes: {}, categories: {}, units: {}, specKeys: {} };
if (!window.__VOCAB__) console.warn("maker-inventory: no vocabulary from the server. Restart `node inv.mjs app` after updating the tool.");
const ALL_CATS = Object.assign({}, ...Object.values(VOCAB.categories));
const vnorm = (s) => String(s ?? "").trim().toLowerCase();
function canon(table, value) {
  const v = vnorm(value); if (!v) return null;
  for (const [key, e] of Object.entries(table)) if (vnorm(key) === v || vnorm(e.en) === v || vnorm(e.sv) === v || (e.aliases || []).some((a) => vnorm(a) === v)) return key;
  return null;
}
const label = (table, value) => { const k = canon(table, value); return k ? table[k][lang] : (value ?? ""); };
const catTable = (file) => VOCAB.categories[file] || ALL_CATS;
const colorLabel = (c) => label(VOCAB.colors, c);
const finishLabel = (f) => label(VOCAB.finishes, f);
const catLabel = (c, file) => label(catTable(file), c);
const unitLabel = (u) => label(VOCAB.units, u);
const specLabel = (k) => label(VOCAB.specKeys, k);
// Every way to name a vocab value, so search finds "grön" and "green" alike.
const allNames = (table, value) => { const k = canon(table, value); return k ? [k, table[k].en, table[k].sv, ...(table[k].aliases || [])] : [value]; };
// Form shows labels in the current language; the server stores the canonical key.
function localizeForm(f, file) {
  // A filament name that is just "material + color" (in any language) is auto: show it empty with a localized placeholder.
  if (file === "filament" && f.name && allNames(VOCAB.colors, f.color).some((c) => vnorm(f.name) === vnorm(`${f.material} ${c}`))) f.name = "";
  if (f.color) f.color = colorLabel(f.color);
  if (f.finish) f.finish = finishLabel(f.finish);
  if (f.category) f.category = catLabel(f.category, file);
  if (f.unit) f.unit = unitLabel(f.unit);
  if (f.specs) f.specs = Object.fromEntries(Object.entries(f.specs).map(([k, v]) => [specLabel(k), v]));
  return f;
}
const fmtNum = (n) => Number(n).toLocaleString(lang === "sv" ? "sv-SE" : "en-US", { maximumFractionDigits: 2 });

// ---------------------------------------------------------------- theme
let theme = store.get("theme") || "auto";
const applyTheme = () => { if (theme === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = theme; };
applyTheme();

// ---------------------------------------------------------------- state
let S = normalize(BOOT.data || { items: [], projects: [] });
let route = parseRoute();
let query = "";
const ui = { attention: false, category: "", sort: { key: "name", dir: 1 }, project: null, altsOpen: new Set(), lightbox: null, lbArmed: false };
let drawer = null; // { mode: "new"|"edit"|"view", originalId, file, form, dirty, armed }
let saving = false;

function normalize(d) { return { items: d.items || [], projects: d.projects || [], versions: d.versions || {}, cad: d.cad || { components: {} }, version: d.version, generatedAt: d.generatedAt, dataDir: d.dataDir, admin: d.admin }; }
function parseRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [page, arg] = h.split("/");
  if (FILES.includes(page)) return { page: "file", file: page };
  if (page === "projects") return { page: "projects", project: arg || null };
  if (page === "settings") return { page: "settings" };
  if (page === "attention") return { page: "attention", kind: ["low", "unverified", "nocad"].includes(arg) ? arg : "all" };
  return { page: "dashboard" };
}

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const unitOf = (it) => it.unit || (it._file === "filament" ? "g" : "pcs");
const isLow = (it) => it.min_qty !== undefined && it.min_qty !== null && Number(it.qty) < Number(it.min_qty);
const needsAttention = (it) => it.verified === false || isLow(it) || !!it.in_use;
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/×/g, "x").replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
const hay = (it) => [it.id, it.name, it.material, it.brand, it.location, it.notes, it.in_use, fileLabel(it._file),
  ...allNames(catTable(it._file), it.category), ...allNames(VOCAB.colors, it.color), ...allNames(VOCAB.finishes, it.finish),
  ...(it.tags || []), ...Object.entries(it.specs || {}).flatMap(([k, v]) => [...allNames(VOCAB.specKeys, k), v])].join(" ").toLowerCase();
const matchQuery = (it) => query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay(it).includes(w));

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  filament: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6"/>',
  electronics: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  hardware: '<path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/><circle cx="12" cy="12" r="3"/>',
  consumables: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
};
const icon = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

function swatch(color, lg) {
  const k = String(color || "").toLowerCase().trim();
  const key = canon(VOCAB.colors, k);
  let st;
  if (key === "transparent") st = "background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50%/8px 8px";
  else if (key) st = "background:" + VOCAB.colors[key].hex;
  else if (/^#[0-9a-f]{3,8}$/i.test(k)) st = "background:" + k;
  else if (!k) st = "background: var(--surface-2)";
  else { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360; st = `background: hsl(${h} 55% 55%)`; }
  return `<span class="sw${lg ? " lg" : ""}" style="${st}" title="${esc(colorLabel(color))}"></span>`;
}
function badges(it) {
  const b = [];
  if (isLow(it)) b.push(`<span class="badge b-bad">${esc(t("b.low"))}</span>`);
  if (it.verified === false) b.push(`<span class="badge b-warn">${esc(t("b.unverified"))}</span>`);
  if (it.in_use) b.push(`<span class="badge b-info">${esc(t("b.inuse", { p: it.in_use }))}</span>`);
  return `<div class="badges">${b.join("")}</div>`;
}
const filamentTitle = (it) => [it.material, colorLabel(it.color)].filter(Boolean).join(" ") || it.name;

// ---------------------------------------------------------------- layout
function renderShell() {
  const counts = Object.fromEntries(FILES.map((f) => [f, S.items.filter((i) => i._file === f)]));
  const nav = (href, ic, label, current, extra = "") =>
    `<a href="#/${href}" ${current ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span>${extra}</a>`;
  const title = route.page === "dashboard" ? (query ? t("results") : t("nav.dashboard"))
    : route.page === "projects" ? t("nav.projects") : route.page === "settings" ? t("nav.settings") : route.page === "attention" ? attnTitle(route.kind) : fileLabel(route.file);
  const stamp = S.generatedAt ? new Date(S.generatedAt).toLocaleString(lang === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "";

  $("#app").innerHTML = `
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><div class="logo">${icon("box")}</div><div>maker-inventory<small>${esc(t("app.sub"))}</small></div></div>
      <nav class="nav">
        <div class="nav-label">${esc(t("nav.workspace"))}</div>
        ${nav("", "grid", t("nav.dashboard"), route.page === "dashboard")}
        ${nav("projects", "projects", t("nav.projects"), route.page === "projects", `<span class="count">${S.projects.filter((p) => !p.example).length}</span>`)}
        ${nav("settings", "gear", t("nav.settings"), route.page === "settings")}
        <div class="nav-label">${esc(t("nav.inventory"))}</div>
        ${FILES.map((f) => nav(f, f, fileLabel(f), route.page === "file" && route.file === f,
          `<span class="count">${counts[f].length}</span>${counts[f].some(needsAttention) ? '<span class="dot" title="' + esc(t("attention")) + '"></span>' : ""}`)).join("")}
      </nav>
      <div class="foot">
        <div class="status ${LIVE ? "" : "ro"}"><span class="pulse"></span><span>${esc(LIVE ? t("live") : t("snapshot"))}${!LIVE && stamp ? " · " + esc(stamp) : ""}</span></div>
        <div class="foot-row">
          <div class="seg" role="group" aria-label="${esc(t("lang"))}">
            <button data-lang="sv" aria-pressed="${lang === "sv"}">SV</button><button data-lang="en" aria-pressed="${lang === "en"}">EN</button>
          </div>
          <div class="seg" role="group" aria-label="${esc(t("theme"))}">
            ${["auto", "light", "dark"].map((m) => `<button data-theme-set="${m}" aria-pressed="${theme === m}" title="${esc(t("theme." + m))}">${icon(m === "light" ? "sun" : m === "dark" ? "moon" : "auto")}</button>`).join("")}
          </div>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1>${esc(title)}</h1>
        <label class="search">${icon("search")}<input id="q" type="search" placeholder="${esc(t("search"))}" value="${esc(query)}" autocomplete="off"><kbd>/</kbd></label>
        ${!LIVE || route.page === "settings" ? "" : route.page === "projects" ? `<button class="btn primary" data-act="new-project">${icon("plus")}<span class="hide-sm">${esc(t("proj.new"))}</span></button>`
          : `<button class="btn primary" data-act="new">${icon("plus")}<span class="hide-sm">${esc(t("add"))}</span></button>`}
      </header>
      ${LIVE ? "" : `<div class="banner">${icon("alert")}<span>${esc(t("ro.banner"))} <code>node inv.mjs app</code></span></div>`}
      <main class="content" id="content"></main>
    </div>
  </div>`;
  renderContent();
}

function renderContent() {
  const el = $("#content");
  if (!el) return;
  if (route.page === "projects") el.innerHTML = projectsView();
  else if (route.page === "settings") el.innerHTML = settingsView();
  else if (route.page === "file") el.innerHTML = fileView(route.file);
  else if (route.page === "attention") el.innerHTML = attentionView(route.kind);
  else el.innerHTML = query.trim() ? searchView() : dashboardView();
}

// ---------------------------------------------------------------- dashboard
function dashboardView() {
  if (!S.items.length) {
    return `<div class="welcome">${icon("box", "i")}<h2>${esc(t("empty.title"))}</h2><p>${esc(t("empty.text"))}</p>
      ${LIVE ? `<button class="btn primary" data-act="new">${icon("plus")}${esc(t("empty.cta"))}</button>` : ""}</div>` + projectsPanel();
  }
  const fil = S.items.filter((i) => i._file === "filament");
  const grams = fil.reduce((s, i) => s + Number(i.qty || 0), 0);
  const low = S.items.filter(isLow), unv = S.items.filter((i) => i.verified === false);
  const toBuy = S.projects.filter((p) => !p.example).reduce((s, p) => s + p.rows.filter((r) => r.status !== "OK" && !r.optional).length, 0);
  const kpi = (cls, label, value, act) => `<button class="kpi ${cls}" data-act="${act}"><div class="label">${esc(label)}</div><div class="value">${value}</div></button>`;

  const attnAll = attentionItems("all"), attn = attnAll.slice(0, 9);
  const attnRows = attn.map((it) => {
    const why = [isLow(it) && t("attn.low", { n: it.min_qty }), it.verified === false && t("attn.unverified"), it.in_use && t("attn.inuse", { p: it.in_use })].filter(Boolean).join(" · ");
    return `<div class="list-row" data-open="${esc(it.id)}">${it._file === "filament" ? swatch(it.color) : `<span class="muted">${icon(it._file)}</span>`}
      <div class="grow"><div class="title">${esc(it._file === "filament" ? filamentTitle(it) : it.name)}</div><div class="sub">${esc(fileLabel(it._file))} · ${esc(why)}</div></div>
      <div class="qty-ro">${fmtNum(it.qty ?? 0)} <small>${esc(unitLabel(unitOf(it)))}</small></div></div>`;
  }).join("");

  const maxG = Math.max(1000, ...fil.map((i) => Number(i.qty || 0)));
  const filRows = [...fil].sort((a, b) => b.qty - a.qty).slice(0, 8).map((it) =>
    `<div class="list-row" data-open="${esc(it.id)}">${swatch(it.color, true)}<div class="grow"><div class="title">${esc(filamentTitle(it))}${it.finish ? ` <span class="muted">· ${esc(finishLabel(it.finish))}</span>` : ""}</div>
      <div class="bar ${isLow(it) ? "low" : ""}"><i style="width:${Math.min(100, (Number(it.qty || 0) / maxG) * 100)}%"></i></div></div>
      <div class="qty-ro">${fmtNum(it.qty ?? 0)} <small>g</small></div></div>`).join("");

  return `<div class="kpis">
      ${kpi("", t("kpi.items"), S.items.length, "nav:")}
      ${kpi("", t("kpi.filament"), (grams / 1000).toLocaleString(lang === "sv" ? "sv-SE" : "en-US", { maximumFractionDigits: 1 }) + " kg", "nav:filament")}
      ${kpi(low.length ? "bad" : "", t("kpi.low"), low.length, "nav:attention/low")}
      ${kpi(unv.length ? "warn" : "", t("kpi.unverified"), unv.length, "nav:attention/unverified")}
      ${kpi(toBuy ? "bad" : "", t("kpi.tobuy"), toBuy, "nav:projects")}
    </div>
    <div class="panels">
      <section class="panel"><div class="panel-h"><h2>${esc(t("attn.title"))}</h2>${attnAll.length ? `<a class="btn sm ghost" href="#/attention">${fmtNum(attnAll.length)} →</a>` : ""}</div>
        <div class="panel-b">${attnRows || `<div class="empty-mini">${esc(t("attn.none"))}</div>`}</div></section>
      <section class="panel"><div class="panel-h"><h2>${esc(t("fil.title"))}</h2><a class="btn sm ghost" href="#/filament">${fmtNum(fil.length)} →</a></div>
        <div class="panel-b">${filRows || `<div class="empty-mini">${esc(t("fil.none"))}</div>`}</div></section>
    </div>${projectsPanel()}`;
}

function projStats(p) {
  const c = (s) => p.rows.filter((r) => r.status === s).length;
  return { ok: c("OK"), short: c("SHORT"), missing: c("MISSING"), n: p.rows.length || 1 };
}
const progBar = (s) => `<div class="prog"><i class="p-ok" style="width:${s.ok / s.n * 100}%"></i><i class="p-short" style="width:${s.short / s.n * 100}%"></i><i class="p-missing" style="width:${s.missing / s.n * 100}%"></i></div>`;

function projectsPanel() {
  const cards = S.projects.map((p) => {
    const s = projStats(p);
    return `<button class="proj-card" data-act="nav:projects/${esc(encodeURIComponent(p.file))}"><div class="name"><span>${esc(p.name)}</span>
      ${p.example ? `<span class="badge b-info">${esc(t("proj.example"))}</span>` : ""}</div>${progBar(s)}
      <div class="meta"><span>${esc(t("proj.ready", { a: s.ok, b: p.rows.length }))}</span>${s.short ? `<span>${esc(t("proj.short", { n: s.short }))}</span>` : ""}${s.missing ? `<span>${esc(t("proj.missing", { n: s.missing }))}</span>` : ""}</div></button>`;
  }).join("");
  return `<section class="panel full"><div class="panel-h"><h2>${esc(t("proj.title"))}</h2></div>
    ${cards ? `<div class="proj-grid">${cards}</div>` : `<div class="hint">${esc(t("proj.empty"))} ${LIVE ? `<button class="btn sm" data-act="new-project" style="margin-left:6px">${icon("plus")}${esc(t("proj.new"))}</button>` : ""}</div>`}</section>`;
}

// ---------------------------------------------------------------- tables
function sortItems(list, file) {
  const { key, dir } = ui.sort;
  const val = (it) => key === "qty" ? Number(it.qty || 0) : key === "name" ? String(file === "filament" ? filamentTitle(it) : it.name).toLowerCase()
    : key === "section" ? fileLabel(it._file) : key === "category" ? catLabel(it.category, it._file).toLowerCase()
    : key === "finish" ? finishLabel(it.finish).toLowerCase() : String(it[key] ?? "").toLowerCase();
  return [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
}
function th(key, label, cls = "") {
  const on = ui.sort.key === key;
  return `<th class="sortable ${cls}" data-sort="${key}">${esc(label)}${on ? `<span class="arrow">${ui.sort.dir > 0 ? "↑" : "↓"}</span>` : ""}</th>`;
}
function qtyCell(it) {
  const u = unitOf(it);
  if (!LIVE) return `<span class="qty-ro">${fmtNum(it.qty ?? 0)} <small>${esc(unitLabel(u))}</small></span>`;
  return `<div class="stepper" data-stop><button data-step="-1" data-id="${esc(it.id)}" aria-label="${esc(t("a.dec"))}">${icon("minus")}</button>
    <span class="v">${fmtNum(it.qty ?? 0)}<small>${esc(unitLabel(u))}</small></span>
    <button data-step="1" data-id="${esc(it.id)}" aria-label="${esc(t("a.inc"))}">${icon("plus")}</button></div>`;
}
const specsText = (it) => Object.entries(it.specs || {}).map(([k, v]) => `${specLabel(k)}: ${v}`).join(" · ");
const tagsHtml = (it) => (it.tags || []).slice(0, 5).map((x) => `<span class="tag">${esc(x)}</span>`).join("") + ((it.tags || []).length > 5 ? `<span class="tag">+${it.tags.length - 5}</span>` : "");

function itemTable(list, file, showSection) {
  if (!list.length) return `<div class="table-wrap"><div class="no-rows">${esc(t("no.rows"))}</div></div>`;
  const rows = sortItems(list, file).map((it) => {
    if (it._file === "filament" && !showSection) {
      return `<tr data-open="${esc(it.id)}"><td><div class="cell-flex">${swatch(it.color, true)}<div><div class="name">${esc(filamentTitle(it))}</div><div class="id">${esc(it.id)}</div></div></div></td>
        <td>${esc(finishLabel(it.finish))}</td><td class="hide-sm">${esc(it.brand || "")}</td>
        <td class="hide-sm" style="min-width:120px"><div class="bar ${isLow(it) ? "low" : ""}"><i style="width:${Math.min(100, Number(it.qty || 0) / (1000 * Math.max(1, Number(it.spools || 1))) * 100)}%"></i></div></td>
        <td class="num hide-sm">${esc(it.spools ?? "")}</td><td class="hide-sm">${esc(it.location || "")}</td><td>${badges(it)}</td><td class="num">${qtyCell(it)}</td></tr>`;
    }
    return `<tr data-open="${esc(it.id)}"><td><div class="cell-flex">${it._file === "filament" ? swatch(it.color) : ""}<div><div class="name">${esc(it._file === "filament" ? filamentTitle(it) : it.name)}</div><div class="id">${esc(it.id)}</div></div></div></td>
      ${showSection ? `<td>${esc(fileLabel(it._file))}</td>` : ""}
      <td>${esc(catLabel(it.category, it._file))}</td><td class="hide-sm">${tagsHtml(it)}</td><td class="specs hide-sm">${esc(specsText(it))}</td>
      <td class="hide-sm">${esc(it.location || "")}</td><td>${badges(it)}</td><td class="num">${qtyCell(it)}</td></tr>`;
  }).join("");
  const head = file === "filament" && !showSection
    ? `${th("name", t("col.color"))}${th("finish", t("col.finish"))}${th("brand", t("col.brand"), "hide-sm")}<th class="hide-sm">${esc(t("col.grams"))}</th>${th("spools", t("col.spools"), "num hide-sm")}${th("location", t("col.location"), "hide-sm")}<th>${esc(t("col.status"))}</th>${th("qty", t("col.qty"), "num")}`
    : `${th("name", t("col.name"))}${showSection ? th("section", t("col.section")) : ""}${th("category", t("col.category"))}<th class="hide-sm">${esc(t("col.tags"))}</th><th class="hide-sm">${esc(t("col.specs"))}</th>${th("location", t("col.location"), "hide-sm")}<th>${esc(t("col.status"))}</th>${th("qty", t("col.qty"), "num")}`;
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fileView(file) {
  const all = S.items.filter((i) => i._file === file);
  if (!all.length) {
    return `<div class="welcome">${icon(file)}<h2>${esc(t("empty.file", { f: fileLabel(file) }))}</h2><p>${esc(t("empty.text"))}</p>
      ${LIVE ? `<button class="btn primary" data-act="new">${icon("plus")}${esc(t("add"))}</button>` : ""}</div>`;
  }
  const catOf = (i) => file === "filament" ? i.material : (canon(catTable(file), i.category) ?? i.category);
  const catName = (c) => file === "filament" ? c : catLabel(c, file);
  const cats = [...new Set(all.map(catOf).filter(Boolean))].sort((a, b) => catName(a).localeCompare(catName(b)));
  const catKey = file === "filament" ? "material" : "category";
  if (ui.category && !cats.includes(ui.category)) ui.category = "";
  const shown = all.filter((i) => matchQuery(i) && (!ui.attention || needsAttention(i)) && (!ui.category || catOf(i) === ui.category));
  return `<div class="toolbar">
      <button class="chip" data-cat="" aria-pressed="${!ui.category}">${esc(t("all"))}</button>
      ${cats.map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${ui.category === c}">${esc(catName(c))}</button>`).join("")}
      <span class="spacer"></span>
      <label class="switch"><input type="checkbox" id="attn" ${ui.attention ? "checked" : ""}>${esc(t("attention"))}</label>
    </div>${itemTable(shown, file, false)}
    <div class="table-foot" style="border:0;background:transparent">${esc(t("count", { n: shown.length, total: all.length }))}</div>`;
}

// Items that need a look, across every section: below min, not verified, or built into something.
function attentionItems(kind) {
  if (kind === "low") return S.items.filter(isLow);
  if (kind === "nocad") return S.items.filter((i) => CAD_FILES.includes(i._file) && !(i.cad_component && S.cad.components[i.cad_component]));
  if (kind === "unverified") return S.items.filter((i) => i.verified === false);
  return [...S.items.filter(isLow), ...S.items.filter((i) => i.verified === false && !isLow(i)), ...S.items.filter((i) => i.in_use && !isLow(i) && i.verified !== false)];
}
const CAD_FILES = ["electronics", "hardware"];
const attnTitle = (kind) => kind === "low" ? t("kpi.low") : kind === "unverified" ? t("kpi.unverified") : kind === "nocad" ? t("cad.missing") : t("attn.title");
function attentionView(kind) {
  const list = attentionItems(kind);
  const tabs = ["all", "unverified", "low", "nocad"].map((k) => `<button class="chip" data-act="nav:attention${k === "all" ? "" : "/" + k}" aria-pressed="${k === kind}">${esc(attnTitle(k))} <span class="muted">${attentionItems(k).length}</span></button>`).join("");
  return `<div class="toolbar">${tabs}</div>` + (list.length ? itemTable(list, null, true) + `<div class="table-foot" style="border:0;background:transparent">${esc(t("count", { n: list.length, total: S.items.length }))}</div>`
    : `<div class="empty-mini">${esc(t("attn.none"))}</div>`);
}
function searchView() {
  const shown = S.items.filter(matchQuery);
  return itemTable(shown, null, true) + `<div class="table-foot" style="border:0;background:transparent">${esc(t("count", { n: shown.length, total: S.items.length }))}</div>`;
}

// ---------------------------------------------------------------- projects
// Near matches the user owns, shown in a row under the need that the user expands on demand.
const altKey = (p, i) => p.file + ":" + i;
function altToggle(p, r, i) {
  if (!r.alternatives.length) return "";
  const open = ui.altsOpen.has(altKey(p, i));
  return `<button type="button" class="alt-toggle" data-alts="${esc(altKey(p, i))}" aria-expanded="${open}">${esc(t("proj.altToggle", { n: r.alternatives.length }))}<span class="chev">▾</span></button>`;
}
function altRow(p, r, i, why) {
  if (!r.alternatives.length || !ui.altsOpen.has(altKey(p, i))) return "";
  const groups = [];
  for (const a of r.alternatives) (groups.find((g) => g.why === a.why) || (groups.push({ why: a.why, list: [] }), groups.at(-1))).list.push(a);
  const line = (a) => {
    const diff = (a.diff || []).map((d) => d.have == null ? t("proj.altMissing", { key: specLabel(d.key) }) : `${specLabel(d.key)} ${d.have}`).join(", ");
    return `<li><a href="#" data-open="${esc(a.id)}">${esc(a.name)}</a><span class="alt-qty">${esc(fmtNum(a.qty) + " " + unitLabel(a.unit))}</span><span class="alt-diff">${esc(diff)}</span></li>`;
  };
  return `<tr class="alt-row"><td></td><td colspan="5">${groups.map((g) => `<div class="alt-head">${esc(t("proj.altHead", { why: why(g.why) }))}</div><ul class="alt-list">${g.list.map(line).join("")}</ul>`).join("")}</td></tr>`;
}
const fromLabel = (f) => { const it = S.items.find((i) => i.id === f.id); return it ? (it._file === "filament" ? filamentTitle(it) : it.name) : (f.name || f.id); };
function projectsView() {
  if (!S.projects.length) return `<div class="welcome">${icon("projects")}<h2>${esc(t("proj.none"))}</h2><p>${esc(t("proj.empty"))}</p>
    ${LIVE ? `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn primary" data-act="new-project">${icon("plus")}${esc(t("proj.new"))}</button>
      <button class="btn" data-act="example-project">${esc(t("proj.fromExample"))}</button></div>` : ""}<p class="hint" style="margin-top:14px">${esc(t("proj.agentHint"))}</p></div>`;
  const cur = S.projects.find((p) => p.file === route.project) || S.projects[0];
  const list = S.projects.map((p) => {
    const s = projStats(p);
    return `<div class="list-row" data-act="nav:projects/${esc(encodeURIComponent(p.file))}" aria-current="${p === cur}"><div class="grow">
      <div class="title">${esc(p.name)}${p.status ? " " + statusBadge(p.status) : ""}</div>${progBar(s)}<div class="sub" style="margin-top:4px">${esc(t("proj.ready", { a: s.ok, b: p.rows.length }))}${p.example ? " · " + esc(t("proj.example")) : ""}</div></div></div>`;
  }).join("");
  const why = (w) => t("why." + w);
  const rows = cur.rows.map((r, ri) => {
    const notes = [r.optional && `<span class="badge b-info">${esc(t("proj.optional"))}</span>`, r.unverified && `<span class="badge b-warn">${esc(t("b.unverified"))}</span>`,
      ...r.from.filter((f) => f.in_use).map((f) => `<span class="badge b-info">${esc(t("proj.inuse", { p: f.in_use }))}</span>`), r.note && `<span class="muted">${esc(r.note)}</span>`].filter(Boolean).join(" ");
    return `<tr style="cursor:default"><td><span class="st st-${r.status}">${r.status === "OK" ? "✓" : r.status === "SHORT" ? "◐" : "✕"}</span></td>
      <td><div class="name">${esc(r.need)} ${altToggle(cur, r, ri)}</div></td><td class="num">${fmtNum(r.qty)} ${esc(unitLabel(r.unit))}</td><td class="num">${fmtNum(r.got)}</td>
      <td class="hide-sm">${r.from.map((f) => `<a href="#" data-open="${esc(f.id)}">${esc(fromLabel(f))}</a>`).join(", ") || "–"}</td><td class="hide-sm">${notes}</td></tr>${altRow(cur, r, ri, why)}`;
  }).join("");
  const buyIdx = cur.rows.map((r, i) => [r, i]).filter(([r]) => r.status !== "OK");
  const shop = buyIdx.length ? buyIdx.map(([r, i]) => `<div class="shop-row"><span class="grow">${esc(r.need)}: <b>${fmtNum(r.qty - r.got)} ${esc(unitLabel(r.unit))}</b>${r.optional ? ` <span class="muted">(${esc(t("proj.optional"))})</span>` : ""}${r.buy?.where ? ` <span class="muted">· ${esc(r.buy.where)}</span>` : ""}${r.buy?.link ? ` <a href="${esc(r.buy.link)}" target="_blank" rel="noopener noreferrer">↗</a>` : ""}</span>
      ${LIVE ? `<button class="btn sm" data-act="restock:${i}" title="${esc(t("proj.restock.hint"))}">${icon("plus")}${esc(t("proj.restock"))}</button>` : ""}</div>`).join("")
    : `<span class="muted">${esc(t("proj.nothing"))}</span>`;
  const canBuild = cur.rows.some((r) => r.from.length);
  return `<div class="proj-layout">
    <section class="panel proj-list"><div class="panel-h"><h2>${esc(t("proj.title"))}</h2><span class="muted">${S.projects.length}</span></div><div class="panel-b">${list}</div></section>
    <div>
      <section class="panel proj-head"><div class="panel-h"><div style="min-width:0"><h2>${esc(cur.name)}</h2>${cur.notes ? `<div class="muted" style="font-size:12.5px;margin-top:2px">${esc(cur.notes)}</div>` : ""}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${statusControl(cur)}
        ${LIVE ? `<button class="btn sm" data-act="edit-project">${icon("edit")}${esc(t("proj.edit"))}</button>
          <button class="btn sm" data-act="build-project" ${canBuild ? "" : "disabled"} title="${esc(t("proj.build.hint"))}">${icon("check")}${esc(t("proj.build"))}</button>` : ""}</div></div></section>
      ${planPanels(cur)}
      <section class="panel full"><div class="panel-h"><h2>${esc(t("proj.needsTitle"))}</h2>${progBar(projStats(cur)).replace('class="prog"', 'class="prog" style="width:110px"')}</div>
        ${cur.rows.length ? `<div style="overflow-x:auto"><table class="proj-table"><thead><tr><th></th><th>${esc(t("proj.need"))}</th><th class="num">${esc(t("proj.qty"))}</th><th class="num">${esc(t("proj.have"))}</th><th class="hide-sm">${esc(t("proj.from"))}</th><th class="hide-sm">${esc(t("proj.notes"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`
          : `<div class="empty-mini">${esc(t("proj.noNeeds"))}</div>`}</section>
      <section class="panel full"><div class="panel-h"><h2>${esc(t("proj.shop"))}</h2>${buyIdx.length ? `<button class="btn sm" data-act="copy-shop">${icon("copy")}${esc(t("proj.copy"))}</button>` : ""}</div><div class="shop">${shop}</div></section>
    </div></div>`;
}
// ---------------------------------------------------------------- project planning
const PROJECT_STATUSES = ["idea", "planning", "building", "done", "paused"];
const statusBadge = (s) => `<span class="badge ps ps-${esc(s)}">${esc(t("ps." + s))}</span>`;
const imgSrc = (img) => (LIVE ? "/projects/" : "projects/") + img.file;
function statusControl(p) {
  if (!LIVE || p.example) return p.status ? statusBadge(p.status) : "";
  return `<select class="status-select ps-${esc(p.status || "none")}" data-status aria-label="${esc(t("ps.label"))}">
    <option value="">${esc(t("ps.none"))}</option>${PROJECT_STATUSES.map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${esc(t("ps." + s))}</option>`).join("")}</select>`;
}
function planPanels(p) {
  const edit = LIVE && !p.example;
  const done = p.todos.filter((x) => x.done).length;
  const todos = p.todos.map((x, i) => `<li class="${x.done ? "done" : ""}"><label><input type="checkbox" data-todo="${i}" ${x.done ? "checked" : ""} ${edit ? "" : "disabled"}><span>${esc(x.text)}</span></label>
    ${edit ? `<button class="icon-btn xs" data-rmtodo="${i}" aria-label="${esc(t("pl.remove"))}" title="${esc(t("pl.remove"))}">${icon("x")}</button>` : ""}</li>`).join("");
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const links = p.links.map((l, i) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title || host(l.url) || l.url)}</a><span class="muted">${esc(l.title ? host(l.url) : "")}</span>
    ${edit ? `<button class="icon-btn xs" data-rmlink="${i}" aria-label="${esc(t("pl.remove"))}" title="${esc(t("pl.remove"))}">${icon("x")}</button>` : ""}</li>`).join("");
  const pics = p.images.map((img, i) => `<figure><button type="button" data-img="${i}" aria-label="${esc(img.caption || t("pl.images"))}"><img src="${esc(imgSrc(img))}" alt="${esc(img.caption || "")}" loading="lazy"></button>${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ""}</figure>`).join("");
  return `<div class="plan-grid">
    <section class="panel"><div class="panel-h"><h2>${esc(t("pl.todo"))}</h2>${p.todos.length ? `<span class="muted">${done}/${p.todos.length}</span>` : ""}</div>
      ${p.todos.length ? `<div class="prog todo-prog"><i style="width:${(done / p.todos.length) * 100}%"></i></div>` : ""}
      ${todos ? `<ul class="todo">${todos}</ul>` : `<div class="empty-mini">${esc(t("pl.todo.none"))}</div>`}
      ${edit ? `<form class="plan-add" data-addtodo><input name="text" placeholder="${esc(t("pl.todo.ph"))}" autocomplete="off"><button class="btn sm">${icon("plus")}${esc(t("pl.add"))}</button></form>` : ""}</section>
    <section class="panel"><div class="panel-h"><h2>${esc(t("pl.links"))}</h2>${p.links.length ? `<span class="muted">${p.links.length}</span>` : ""}</div>
      ${links ? `<ul class="links">${links}</ul>` : `<div class="empty-mini">${esc(t("pl.links.none"))}</div>`}
      ${edit ? `<form class="plan-add" data-addlink><input name="title" placeholder="${esc(t("pl.link.title"))}" autocomplete="off" style="max-width:38%"><input name="url" type="url" placeholder="https://…" autocomplete="off"><button class="btn sm">${icon("plus")}${esc(t("pl.add"))}</button></form>` : ""}</section>
  </div>
  <section class="panel full gallery-panel" ${edit ? "data-drop" : ""}><div class="panel-h"><h2>${esc(t("pl.images"))}</h2>
    ${edit ? `<label class="btn sm">${icon("plus")}${esc(t("pl.images.add"))}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden data-upload></label>` : p.images.length ? `<span class="muted">${p.images.length}</span>` : ""}</div>
    ${pics ? `<div class="gallery">${pics}</div>` : `<div class="empty-mini">${esc(edit ? t("pl.images.none") : t("pl.images.empty"))}</div>`}</section>`;
}
function lightboxHtml(p, i) {
  const img = p.images[i]; if (!img) return "";
  const edit = LIVE && !p.example, n = p.images.length;
  return `<div class="lightbox" data-lb role="dialog" aria-modal="true" aria-label="${esc(t("pl.images"))}">
    <div class="lb-top"><span>${i + 1} / ${n}</span><span class="spacer"></span>
      ${edit ? `<button class="btn sm danger ${ui.lbArmed ? "armed" : ""}" data-lbdel>${esc(ui.lbArmed ? t("pl.confirm") : t("pl.delete"))}</button>` : ""}
      <button class="icon-btn" data-lbclose aria-label="${esc(t("d.close"))}">${icon("x")}</button></div>
    <div class="lb-stage">${n > 1 ? `<button class="lb-nav" data-lbgo="-1" aria-label="${esc(t("pl.prev"))}">‹</button>` : ""}
      <img src="${esc(imgSrc(img))}" alt="${esc(img.caption || "")}">
      ${n > 1 ? `<button class="lb-nav" data-lbgo="1" aria-label="${esc(t("pl.next"))}">›</button>` : ""}</div>
    <div class="lb-cap">${edit ? `<input data-caption value="${esc(img.caption || "")}" placeholder="${esc(t("pl.caption.ph"))}" aria-label="${esc(t("pl.caption"))}">` : esc(img.caption || "")}</div></div>`;
}
function renderLightbox() {
  document.querySelector(".lightbox")?.remove();
  const p = curProj();
  if (ui.lightbox == null || !p || !p.images[ui.lightbox]) { ui.lightbox = null; return; }
  document.body.insertAdjacentHTML("beforeend", lightboxHtml(p, ui.lightbox));
}
const curProj = () => route.page === "projects" ? (S.projects.find((x) => x.file === route.project) || S.projects[0]) : null;

// Save planning fields; the server keeps needs as they are and refuses if the file changed meanwhile.
async function savePlan(p, patch) {
  try {
    const r = await api("PUT", "/api/projects/" + encodeURIComponent(p.file), { project: { name: p.name, notes: p.notes, needs: p.needs, ...patch }, expect: p.version });
    S = normalize(r.state); renderContent(); renderLightbox(); return true;
  } catch (e) {
    toast(e.status === 409 ? t("t.conflict") : t("t.error", { e: e.message }), true);
    if (e.status === 409) await loadState(true);
    return false;
  }
}
async function uploadImages(files) {
  const okType = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  let added = 0;
  for (const f of files) {
    if (!okType.includes(f.type)) { toast(t("pl.images.type", { n: f.name || "?" }), true); continue; }
    if (f.size > 8 * 1024 * 1024) { toast(t("pl.images.big", { n: f.name || "?" }), true); continue; }
    const p = curProj(); if (!p) return;
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    try { const r = await api("POST", "/api/projects/" + encodeURIComponent(p.file) + "/images", { data, expect: p.version }); S = normalize(r.state); added++; }
    catch (e) { toast(e.status === 409 ? t("t.conflict") : t("t.error", { e: e.message }), true); if (e.status === 409) await loadState(true); break; }
  }
  if (added) { renderContent(); toast(t("pl.images.added", { n: added })); }
}
async function deleteImage(p, i) {
  try {
    const r = await api("DELETE", "/api/projects/" + encodeURIComponent(p.file) + "/images", { image: p.images[i].file, expect: p.version });
    S = normalize(r.state); ui.lbArmed = false;
    const np = curProj(); ui.lightbox = np && np.images.length ? Math.min(i, np.images.length - 1) : null;
    renderContent(); renderLightbox();
  } catch (e) { toast(e.status === 409 ? t("t.conflict") : t("t.error", { e: e.message }), true); if (e.status === 409) await loadState(true); }
}

function shoppingMarkdown(p) {
  return `## ${t("proj.shop")}: ${p.name}\n\n` + p.rows.filter((r) => r.status !== "OK")
    .map((r) => `- [ ] ${r.need}: ${r.qty - r.got} ${unitLabel(r.unit)}${r.optional ? ` (${t("proj.optional")})` : ""}${r.buy?.where ? ` – ${r.buy.where}` : ""}`).join("\n");
}

// ---------------------------------------------------------------- drawer
const MATERIALS = ["PLA", "PLA+", "PETG", "TPU", "ABS", "ASA", "PLA-CF", "PETG-CF", "PC", "Nylon"];
// Datalist options: every vocab label in the current language, plus the user's own values that aren't in the vocab.
const vocabOptions = (table, own) => [...Object.values(table).map((e) => e[lang]), ...own.filter((v) => v && !canon(table, v))];

function openDrawer(mode, item, prefill) {
  const base = item ? JSON.parse(JSON.stringify(item)) : { _file: route.page === "file" ? route.file : "electronics", qty: 1, ...JSON.parse(JSON.stringify(prefill || {})) };
  drawer = { kind: "item", mode, originalId: item?.id || null, file: base._file, form: localizeForm(base, base._file), dirty: !!prefill, armed: false, idTouched: !!item || !!prefill?.id, error: "" };
  if (prefill && !prefill.id) autoId();
  renderDrawer();
  requestAnimationFrame(() => { $("#scrim").classList.add("open"); $("#drawer").classList.add("open"); setTimeout(() => $("#drawer [name=name]")?.focus(), 60); });
}
function closeDrawer(force) {
  if (!drawer) return;
  if (drawer.kind === "project") syncProject();
  if (drawer.dirty && !force && !confirm(t("unsaved"))) return;
  drawer = null;
  $("#scrim").classList.remove("open"); $("#drawer").classList.remove("open");
}

function renderDrawer() {
  if (drawer?.kind === "project") return renderProjectDrawer();
  if (drawer?.kind === "build") return renderBuildDrawer();
  return renderItemDrawer();
}
function renderItemDrawer() {
  const d = drawer, f = d.form, ro = !LIVE, fil = d.file === "filament";
  const dis = ro ? "disabled" : "";
  const datalist = (id, opts) => `<datalist id="${id}">${[...new Set(opts)].filter(Boolean).map((o) => `<option value="${esc(o)}">`).join("")}</datalist>`;
  const sameFile = S.items.filter((i) => i._file === d.file);
  const field = (name, label, attrs = "", hint = "", req = false) =>
    `<label class="field"><span>${esc(label)}${req ? " <em>*</em>" : ""}</span><input name="${name}" value="${esc(f[name] ?? "")}" ${attrs} ${dis}>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  const title = ro ? t("d.view") : d.mode === "new" ? t("d.new") : t("d.edit");
  const specs = Object.entries(f.specs || {});
  if (!ro) specs.push(["", ""]);

  $("#drawer").innerHTML = `
    <div class="drawer-h">${fil ? swatch(f.color, true) : icon(d.file)}<h2>${esc(d.mode === "new" ? title : (fil ? filamentTitle(f) : f.name) || title)}</h2>
      <button class="icon-btn" data-act="close" aria-label="${esc(t("d.close"))}">${icon("x")}</button></div>
    <form class="drawer-b" id="itemForm" autocomplete="off" novalidate>
      ${d.error ? `<div class="form-err">${esc(d.error)}</div>` : ""}
      <div class="section-t">${esc(t("f.basics"))}</div>
      <label class="field"><span>${esc(t("f.section"))}</span><select name="_file" ${dis}>${FILES.map((x) => `<option value="${x}" ${x === d.file ? "selected" : ""}>${esc(fileLabel(x))}</option>`).join("")}</select></label>
      ${fil ? `<div class="row2">${field("material", t("f.material"), 'list="dl-mat"', "", true)}
          <label class="field"><span>${esc(t("f.color"))} <em>*</em></span><div class="color-in">${swatch(f.color)}<input name="color" list="dl-color" value="${esc(f.color ?? "")}" ${dis}></div></label></div>
        <div class="row2">${field("finish", t("f.finish"), 'list="dl-finish"')}${field("brand", t("f.brand"), 'list="dl-brand"')}</div>
        ${datalist("dl-mat", [...MATERIALS, ...sameFile.map((i) => i.material)])}${datalist("dl-color", vocabOptions(VOCAB.colors, sameFile.map((i) => i.color)))}
        ${datalist("dl-finish", vocabOptions(VOCAB.finishes, sameFile.map((i) => i.finish)))}${datalist("dl-brand", sameFile.map((i) => i.brand))}` : ""}
      ${fil ? field("name", t("f.name"), `placeholder="${esc(filamentTitle({ ...f, name: "" }) || "")}"`, t("f.name.auto")) : field("name", t("f.name"), "", "", true)}
      <div class="row2">${field("id", t("f.id"), 'class="mono" spellcheck="false"', t("f.id.hint"), true)}
        ${fil ? "" : field("category", t("f.category"), 'list="dl-cat"')}</div>
      ${fil ? "" : datalist("dl-cat", vocabOptions(catTable(d.file), sameFile.map((i) => i.category)))}
      <div class="section-t">${esc(t("f.stock"))}</div>
      <div class="row3">${field("qty", fil ? t("f.grams") : t("f.qty"), 'type="number" min="0" step="any" inputmode="decimal"', "", true)}
        ${fil ? field("spools", t("f.spools"), 'type="number" min="0" step="1"') : field("unit", t("f.unit"), `list="dl-unit" placeholder="${esc(unitLabel("pcs"))}"`)}
        ${field("min_qty", t("f.min"), 'type="number" min="0" step="any"')}</div>
      ${datalist("dl-unit", vocabOptions(VOCAB.units, []))}
      <div class="row2">${field("location", t("f.location"), 'list="dl-loc"')}${field("in_use", t("f.inuse"), "", t("f.inuse.hint"))}</div>
      ${datalist("dl-loc", S.items.map((i) => i.location))}
      <label class="check"><input type="checkbox" name="verified" ${f.verified === false ? "" : "checked"} ${dis}><span>${esc(t("f.verified"))}</span></label>
      <div class="section-t">${esc(t("f.details"))}</div>
      <div class="field"><span>${esc(t("f.tags"))}</span><div class="tags-input" id="tagsBox">${(f.tags || []).map((x, i) =>
        `<span class="t">${esc(x)}${ro ? "" : `<button type="button" data-rmtag="${i}" aria-label="${esc(t("a.remove"))}">×</button>`}</span>`).join("")}${ro ? "" : '<input id="tagIn" spellcheck="false">'}</div>
        ${ro ? "" : `<small>${esc(t("f.tags.hint"))}</small>`}</div>
      <div class="field"><span>${esc(t("f.specs"))}</span><div class="kv">${specs.map(([k, v], i) =>
        `<div class="r"><input data-spec-k="${i}" placeholder="${esc(t("f.spec.key"))}" list="dl-spec" value="${esc(k)}" ${dis}><input data-spec-v="${i}" placeholder="${esc(t("f.spec.val"))}" value="${esc(v)}" ${dis}>
        ${ro || (!k && !v) ? "<span></span>" : `<button type="button" class="icon-btn" data-rmspec="${i}" aria-label="${esc(t("a.remove"))}">${icon("x")}</button>`}</div>`).join("")}</div></div>
      ${datalist("dl-spec", vocabOptions(VOCAB.specKeys, []))}
      ${fil ? "" : `${field("cad_component", t("f.cad"), 'list="dl-cad" class="mono" spellcheck="false"', t("f.cad.hint"))}${datalist("dl-cad", Object.keys(S.cad.components))}${cadPanel(f, d)}`}
      <label class="field"><span>${esc(t("f.notes"))}</span><textarea name="notes" ${dis}>${esc(f.notes ?? "")}</textarea></label>
      ${field("source", t("f.source"))}
    </form>
    <div class="drawer-f">
      ${!ro && d.mode === "edit" ? `<button class="btn danger ${d.armed ? "armed" : ""}" data-act="delete">${esc(d.armed ? t("d.confirm") : t("d.delete"))}</button>` : ""}
      <span class="spacer"></span>
      <button class="btn" data-act="close">${esc(ro ? t("d.close") : t("d.cancel"))}</button>
      ${ro ? "" : `<button class="btn primary" data-act="save" ${saving ? "disabled" : ""}>${esc(t("d.save"))}</button>`}
    </div>`;
}

// Dimensions of the linked CAD component, read-only: they live in the library, not in the inventory.
const SRC_CLASS = { MEASURED: "b-ok", DRAWING: "b-info", DATASHEET: "b-info", STEP: "b-info", DISTRIBUTOR: "b-warn", COMMUNITY: "b-warn", SCALED: "b-bad", ASSUMED: "b-bad" };
function cadPanel(f, d) {
  const id = String(f.cad_component || "").trim();
  const c = id ? S.cad.components[id] : null;
  const box = (inner) => `<div class="field"><span>${esc(t("cad.title"))}</span><div class="cad-box">${inner}</div></div>`;
  if (!c) {
    const sug = !id && Object.values(S.cad.components).find((x) => (x.inventory_ids || []).includes(d.originalId || f.id));
    return box(`<div class="muted">${esc(t("cad.none"))}${id ? " " + esc(t("cad.nofile", { id, dir: S.cad.dir || "" })) : ""}</div>
      ${sug ? `<div class="cad-sug">${esc(t("cad.suggest", { id: sug.id }))}${LIVE ? ` <button type="button" class="btn sm" data-cadlink="${esc(sug.id)}">${esc(t("cad.use"))}</button>` : ""}</div>` : ""}`);
  }
  if (c.error) return box(`<div class="form-err">${esc(t("cad.error", { file: c.file, e: c.error }))}</div>`);
  const fmt = (v) => (typeof v === "number" ? fmtNum(v) : esc(v ?? "–"));
  const unit = c.unit ? " " + c.unit : "";
  const groups = [];
  for (const x of c.dims) {
    const h = cadHuman(x, c);
    (groups.find((g) => g.key === h.group) || (groups.push({ key: h.group, title: h.groupTitle, rows: [] }), groups.at(-1))).rows.push({ x, label: h.label });
  }
  groups.sort((a, b) => (a.key === "_other") - (b.key === "_other"));
  const rows = groups.map((g) => `<tr class="cad-grp"><th colspan="5">${esc(g.title)}</th></tr>` + g.rows.map(({ x, label }) => `<tr>
    <td><div class="cad-label">${esc(label)}</div><div class="cad-code mono">${esc(x.name)}</div>${x.note ? `<div class="cad-note">${esc(x.note)}</div>` : ""}</td>
    <td class="num"><b>${fmt(x.v)}</b>${typeof x.v === "number" ? `<small>${esc(unit)}</small>` : ""}</td>
    <td>${x.src ? `<span class="badge ${SRC_CLASS[x.src] || "b-info"}" title="${esc(t("src." + x.src) === "src." + x.src ? x.src : t("src." + x.src))}">${esc(x.src)}</span>` : "–"}</td>
    <td class="num">${x.unc != null ? "±" + fmt(x.unc) : "–"}</td><td title="${esc(c.sources?.[x.ref] || "")}">${esc(x.ref || "")}</td></tr>`).join("")).join("");
  const more = [c.frame && `<details><summary>${esc(t("cad.frame"))}</summary><p>${esc(cadText(c.frame))}</p></details>`,
    c.notes && `<details><summary>${esc(t("cad.about"))}</summary><p>${esc(cadText(c.notes))}</p></details>`].filter(Boolean).join("");
  return box(`<div class="cad-head"><b>${esc(cadText(c.name))}</b><span class="muted">${esc(t("cad.count", { n: c.dims.length, file: c.file }))}</span></div>
    ${more ? `<div class="cad-more">${more}</div>` : ""}
    <div class="cad-scroll"><table class="cad-dims"><thead><tr><th>${esc(t("cad.dim"))}</th><th class="num">${esc(t("cad.value"))}</th><th>${esc(t("cad.src"))}</th><th class="num">±</th><th>${esc(t("cad.ref"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${c.confirm?.length ? `<div class="cad-confirm">${esc(t("cad.confirm"))}<ul>${c.confirm.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></div>` : ""}
    <small class="muted">${esc(t("cad.readonly"))}</small>`);
}
// Library texts can be a string or { en, sv }.
const cadText = (v) => (v && typeof v === "object" ? v[lang] ?? v.en ?? Object.values(v)[0] ?? "" : v ?? "");
// Readable names for script-style dimension names (pcb_l, h1_x, usb_x0 …) when the library gives no
// label/group: the last part says what is measured, the rest which feature it belongs to.
const CAD_WHAT = {
  l: ["Length", "Längd"], len: ["Length", "Längd"], w: ["Width", "Bredd"], t: ["Thickness", "Tjocklek"], h: ["Height", "Höjd"],
  d: ["Diameter", "Diameter"], od: ["Outer diameter", "Ytterdiameter"], r: ["Radius", "Radie"],
  x: ["X position", "Läge X"], y: ["Y position", "Läge Y"], z: ["Z position", "Läge Z"],
  x0: ["Starts at X", "Börjar vid X"], x1: ["Ends at X", "Slutar vid X"], y0: ["Starts at Y", "Börjar vid Y"], y1: ["Ends at Y", "Slutar vid Y"],
  z0: ["Starts at Z", "Börjar vid Z"], z1: ["Ends at Z", "Slutar vid Z"],
};
const CAD_PART = {
  pcb: ["Circuit board", "Kretskort"], hole: ["Mounting holes", "Monteringshål"], usb: ["USB jack", "USB-uttag"], dc: ["DC power jack", "DC-uttag"],
  hdr: ["Pin headers", "Stiftlister"], usb_plug: ["USB cable plug", "USB-kabelns kontakt"], dc_plug: ["DC cable plug", "DC-kabelns kontakt"],
  under: ["Clearance under the board", "Utrymme under kortet"], standoff_free: ["Free space around standoffs", "Fritt utrymme runt distanser"],
  body: ["Body", "Kropp"], shaft: ["Shaft", "Axel"], gearbox: ["Gearbox", "Växellåda"], horn: ["Servo horn", "Servoarm"], tab: ["Mounting tab", "Fästöra"],
  motor: ["Motor", "Motor"], wheel: ["Wheel", "Hjul"], cable: ["Cable", "Kabel"],
};
const pickLang = (pair) => pair[lang === "sv" ? 1 : 0];
function cadHuman(x, c) {
  const parts = x.name.split("_");
  const what = parts.length > 1 && CAD_WHAT[parts.at(-1)] ? parts.pop() : null;
  const key = parts.join("_");
  const partName = (k) => { const m = /^h(\d+)$/.exec(k); return m ? (lang === "sv" ? `Hål ${m[1]}` : `Hole ${m[1]}`) : CAD_PART[k] ? pickLang(CAD_PART[k]) : k.replace(/_/g, " "); };
  const group = x.group ?? (what ? key : "_other");
  const groupTitle = x.group ? (cadText(c.groups?.[x.group]) || partName(x.group)) : what ? partName(key) : t("cad.other");
  const label = x.label ? cadText(x.label) : what ? pickLang(CAD_WHAT[what]) : partName(key);
  return { group, groupTitle, label };
}
function readSpecs() {
  const specs = {};
  document.querySelectorAll("[data-spec-k]").forEach((k) => {
    const v = document.querySelector(`[data-spec-v="${k.dataset.specK}"]`);
    if (k.value.trim()) specs[k.value.trim()] = v.value.trim();
  });
  return specs;
}
function syncForm() {
  const form = $("#itemForm"); if (!form || !drawer) return;
  const f = drawer.form;
  for (const el of form.elements) {
    if (!el.name || el.name === "_file") continue;
    if (el.name === "verified") f.verified = el.checked ? undefined : false;
    else f[el.name] = el.value;
  }
  f.specs = readSpecs();
}
function autoId() {
  const f = drawer.form;
  if (drawer.idTouched) return;
  // ids use the canonical (English) words so they don't depend on the UI language
  const base = drawer.file === "filament"
    ? [f.material, canon(VOCAB.colors, f.color) ?? f.color, canon(VOCAB.finishes, f.finish) ?? f.finish, f.brand].filter(Boolean).join(" ")
    : f.name;
  f.id = slug(base);
  const el = $("#itemForm [name=id]"); if (el) el.value = f.id;
}

async function api(method, path, body) {
  const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || res.statusText); e.status = res.status; throw e; }
  return data;
}
function expectFor(...files) { const e = {}; for (const f of files) if (f && S.versions[f]) e[f] = S.versions[f]; return e; }

async function saveDrawer() {
  if (drawer?.kind === "project") return saveProjectDrawer();
  if (drawer?.kind === "build") return confirmBuild();
  if (!drawer || saving) return;
  syncForm();
  const d = drawer, f = { ...d.form };
  if (d.file === "filament" && !f.name) f.name = filamentTitle(f);
  if (!f.id) f.id = slug(d.file === "filament" ? [f.material, f.color, f.finish].join(" ") : f.name);
  delete f._file;
  const prevFile = d.originalId ? S.items.find((i) => i.id === d.originalId)?._file : null;
  saving = true; renderDrawerKeepScroll();
  try {
    const r = d.mode === "new"
      ? await api("POST", "/api/items", { file: d.file, item: f, expect: expectFor(d.file) })
      : await api("PUT", "/api/items/" + encodeURIComponent(d.originalId), { file: d.file, item: f, expect: expectFor(d.file, prevFile) });
    S = normalize(r.state);
    toast(d.mode === "new" ? t("t.added", { n: r.item.name }) : t("t.saved"));
    saving = false; closeDrawer(true); renderShell();
  } catch (e) {
    saving = false;
    if (e.status === 409) { toast(t("t.conflict"), true); await loadState(true); drawer && (drawer.error = t("t.conflict")); }
    else if (drawer) drawer.error = t("t.error", { e: e.message });
    renderDrawerKeepScroll();
  }
}
async function deleteCurrent() {
  if (drawer?.kind === "project") return deleteProjectDrawer();
  const d = drawer;
  if (!d.armed) { d.armed = true; syncForm(); renderDrawerKeepScroll(); return; }
  const prev = S.items.find((i) => i.id === d.originalId);
  try {
    const r = await api("DELETE", "/api/items/" + encodeURIComponent(d.originalId), { expect: expectFor(prev?._file) });
    S = normalize(r.state); toast(t("t.deleted", { n: prev?.name || d.originalId })); closeDrawer(true); renderShell();
  } catch (e) {
    if (e.status === 409) { toast(t("t.conflict"), true); await loadState(true); }
    else toast(t("t.error", { e: e.message }), true);
  }
}
async function step(id, dir) {
  const it = S.items.find((i) => i.id === id); if (!it) return;
  const inc = unitOf(it) === "g" ? 50 : 1;
  const item = { ...it, qty: Math.max(0, Number(it.qty || 0) + dir * inc) };
  delete item._file;
  it.qty = item.qty; renderContent(); // optimistic
  try { const r = await api("PUT", "/api/items/" + encodeURIComponent(id), { file: it._file, item, expect: expectFor(it._file) }); S = normalize(r.state); renderShell(); }
  catch (e) { if (e.status === 409) toast(t("t.conflict"), true); else toast(t("t.error", { e: e.message }), true); await loadState(true); }
}
function renderDrawerKeepScroll() { const b = $("#drawer .drawer-b"); const top = b ? b.scrollTop : 0; renderDrawer(); const nb = $("#drawer .drawer-b"); if (nb) nb.scrollTop = top; }

// ---------------------------------------------------------------- project editor
// A need is edited as flat form fields; the server cleans it and stores canonical values.
function guessFile(m) {
  if (m.file) return m.file;
  if (m.material || m.color || m.finish) return "filament";
  for (const f of FILES) if (m.category && VOCAB.categories[f] && canon(VOCAB.categories[f], m.category)) return f;
  return "";
}
function needToForm(n = {}) {
  const m = n.match || {}, file = guessFile(m);
  return { name: n.name || "", mode: n.id ? "item" : "match", id: n.id || "", qty: n.qty ?? 1, unit: n.unit ? unitLabel(n.unit) : "",
    optional: !!n.optional, note: n.note || "", where: n.buy?.where || "", price: n.buy?.est_price || "", link: n.buy?.link || "",
    file: m.file || "", category: m.category ? catLabel(m.category, file) : "", material: m.material || "",
    color: m.color ? colorLabel(m.color) : "", finish: m.finish ? finishLabel(m.finish) : "", brand: m.brand || "",
    tags: (m.tags || []).join(", "), specs: Object.entries(m.specs || {}).map(([k, v]) => `${specLabel(k)}=${v}`).join(", "), text: m.text || "" };
}
function formToNeed(f) {
  const n = { name: f.name, qty: f.qty, unit: f.unit, optional: f.optional, note: f.note, buy: { where: f.where, est_price: f.price, link: f.link } };
  if (f.mode === "item") n.id = f.id;
  else n.match = { file: f.file, category: f.file === "filament" ? "" : f.category, material: f.material, color: f.color, finish: f.finish, brand: f.brand, text: f.text,
    tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
    specs: Object.fromEntries(f.specs.split(",").map((s) => s.split("=")).filter((p) => p.length >= 2 && p[0].trim()).map(([k, ...v]) => [k.trim(), v.join("=").trim()])) };
  return n;
}
function relabelNeed(n) {
  const file = n.file || guessFile({ material: n.material, color: n.color, category: n.category });
  return { unit: n.unit ? unitLabel(n.unit) : "", category: n.category ? catLabel(n.category, file) : "", color: n.color ? colorLabel(n.color) : "",
    finish: n.finish ? finishLabel(n.finish) : "",
    specs: n.specs.split(",").map((p) => p.split("=")).filter((p) => p[0].trim()).map(([k, ...v]) => `${specLabel(k.trim())}=${v.join("=").trim()}`).join(", ") };
}
function openProject(mode, p) {
  drawer = { kind: "project", mode, file: p?.file || null, version: p?.version, dirty: false, armed: false, error: "",
    form: { name: p?.name || "", notes: p?.notes || "", needs: (p?.needs?.length ? p.needs : [{}]).map(needToForm) } };
  renderDrawer(); showDrawer("[name=pname]");
}
function showDrawer(focusSel) {
  requestAnimationFrame(() => { $("#scrim").classList.add("open"); $("#drawer").classList.add("open"); setTimeout(() => $(`#drawer ${focusSel}`)?.focus(), 60); });
}
function syncProject() {
  const form = $("#projForm"); if (!form || drawer?.kind !== "project") return;
  drawer.form.name = form.querySelector("[name=pname]").value;
  drawer.form.notes = form.querySelector("[name=pnotes]").value;
  form.querySelectorAll(".need-card").forEach((card) => {
    const f = drawer.form.needs[Number(card.dataset.ni)];
    card.querySelectorAll("[data-nf]").forEach((el) => { f[el.dataset.nf] = el.type === "checkbox" ? el.checked : el.value; });
  });
}
function itemOptionLabel(it) { return `${it._file === "filament" ? filamentTitle(it) : it.name} (${fmtNum(it.qty ?? 0)} ${unitLabel(unitOf(it))})`; }

function renderProjectDrawer() {
  const d = drawer, f = d.form;
  const dl = (id, opts) => `<datalist id="${id}">${[...new Set(opts)].filter(Boolean).map((o) => `<option value="${esc(o)}">`).join("")}</datalist>`;
  const inp = (nf, val, label, attrs = "") => `<label class="field"><span>${esc(label)}</span><input data-nf="${nf}" value="${esc(val ?? "")}" ${attrs}></label>`;
  const itemSelect = (sel) => `<select data-nf="id"><option value="">${esc(t("pe.pick"))}</option>${FILES.map((file) => {
    const its = S.items.filter((i) => i._file === file); if (!its.length) return "";
    return `<optgroup label="${esc(fileLabel(file))}">${its.map((it) => `<option value="${esc(it.id)}" ${it.id === sel ? "selected" : ""}>${esc(itemOptionLabel(it))}</option>`).join("")}</optgroup>`;
  }).join("")}</select>`;
  const cards = f.needs.map((n, i) => {
    const fil = n.file === "filament";
    const matchFields = `
      <div class="row2"><label class="field"><span>${esc(t("f.section"))}</span><select data-nf="file" data-rerender><option value="">${esc(t("pe.anySection"))}</option>
        ${FILES.map((x) => `<option value="${x}" ${x === n.file ? "selected" : ""}>${esc(fileLabel(x))}</option>`).join("")}</select></label>
        ${fil ? inp("material", n.material, t("f.material"), 'list="dl-mat"') : inp("category", n.category, t("f.category"), `list="dl-cat-${n.file || "all"}"`)}</div>
      ${fil ? `<div class="row3">${inp("color", n.color, t("f.color"), 'list="dl-color"')}${inp("finish", n.finish, t("f.finish"), 'list="dl-finish"')}${inp("brand", n.brand, t("f.brand"))}</div>` : ""}
      <div class="row2">${inp("tags", n.tags, t("pe.tags"), `placeholder="${esc(t("pe.tags.ph"))}"`)}${inp("specs", n.specs, t("pe.specs"), `placeholder="${esc(t("pe.specs.ph"))}"`)}</div>`;
    return `<div class="need-card" data-ni="${i}">
      <div class="need-top"><span class="need-no">${i + 1}</span>
        <div class="seg" role="group"><button type="button" data-nmode="match" aria-pressed="${n.mode === "match"}">${esc(t("pe.mode.match"))}</button><button type="button" data-nmode="item" aria-pressed="${n.mode === "item"}">${esc(t("pe.mode.item"))}</button></div>
        <span class="spacer"></span><button type="button" class="icon-btn" data-rmneed="${i}" aria-label="${esc(t("pe.remove"))}" title="${esc(t("pe.remove"))}">${icon("x")}</button></div>
      <div class="row-need">${inp("name", n.name, t("pe.what"), `placeholder="${esc(t("pe.what.ph"))}"`)}${inp("qty", n.qty, t("f.qty"), 'type="number" min="0" step="any"')}${inp("unit", n.unit, t("f.unit"), `list="dl-unit" placeholder="${esc(unitLabel(fil ? "g" : "pcs"))}"`)}</div>
      ${n.mode === "item" ? `<label class="field"><span>${esc(t("pe.item"))}</span>${itemSelect(n.id)}<small>${esc(t("pe.item.hint"))}</small></label>` : matchFields}
      <label class="check"><input type="checkbox" data-nf="optional" ${n.optional ? "checked" : ""}><span>${esc(t("pe.optional"))}</span></label>
      <details ${n.note || n.where || n.price || n.link || n.text ? "open" : ""}><summary>${esc(t("pe.more"))}</summary>
        ${inp("note", n.note, t("f.notes"))}
        ${n.mode === "match" ? inp("text", n.text, t("pe.text"), `placeholder="${esc(t("pe.text.ph"))}"`) : ""}
        <div class="row3">${inp("where", n.where, t("pe.where"))}${inp("price", n.price, t("pe.price"))}${inp("link", n.link, t("pe.link"), 'type="url"')}</div>
      </details></div>`;
  }).join("");
  $("#drawer").innerHTML = `
    <div class="drawer-h">${icon("projects")}<h2>${esc(d.mode === "new" ? t("pe.new") : f.name || t("pe.edit"))}</h2>
      <button class="icon-btn" data-act="close" aria-label="${esc(t("d.close"))}">${icon("x")}</button></div>
    <form class="drawer-b" id="projForm" autocomplete="off" novalidate>
      ${d.error ? `<div class="form-err">${esc(d.error)}</div>` : ""}
      <label class="field"><span>${esc(t("pe.name"))} <em>*</em></span><input name="pname" value="${esc(f.name)}" placeholder="${esc(t("pe.name.ph"))}"></label>
      <label class="field"><span>${esc(t("f.notes"))}</span><textarea name="pnotes" placeholder="${esc(t("pe.notes.ph"))}">${esc(f.notes)}</textarea></label>
      <div class="section-t">${esc(t("pe.needs"))} · ${f.needs.length}</div>
      <small class="muted" style="margin-top:-6px">${esc(t("pe.needs.hint"))}</small>
      ${cards}
      <button type="button" class="btn" data-act="add-need" style="align-self:flex-start">${icon("plus")}${esc(t("pe.add"))}</button>
      ${dl("dl-mat", [...MATERIALS, ...S.items.map((i) => i.material)])}${dl("dl-color", vocabOptions(VOCAB.colors, S.items.map((i) => i.color)))}
      ${dl("dl-finish", vocabOptions(VOCAB.finishes, []))}${dl("dl-unit", vocabOptions(VOCAB.units, []))}
      ${dl("dl-cat-all", vocabOptions(ALL_CATS, S.items.map((i) => i.category)))}
      ${FILES.map((file) => dl(`dl-cat-${file}`, vocabOptions(catTable(file), S.items.filter((i) => i._file === file).map((i) => i.category)))).join("")}
    </form>
    <div class="drawer-f">
      ${d.mode === "edit" ? `<button class="btn danger ${d.armed ? "armed" : ""}" data-act="delete">${esc(d.armed ? t("d.confirm") : t("d.delete"))}</button>` : ""}
      <span class="spacer"></span>
      <button class="btn" data-act="close">${esc(t("d.cancel"))}</button>
      <button class="btn primary" data-act="save" ${saving ? "disabled" : ""}>${esc(t("d.save"))}</button>
    </div>`;
}

async function saveProjectDrawer() {
  if (!drawer || saving) return;
  syncProject();
  const d = drawer;
  const project = { name: d.form.name, notes: d.form.notes, needs: d.form.needs.map(formToNeed) };
  saving = true; renderDrawerKeepScroll();
  try {
    const r = d.mode === "new" ? await api("POST", "/api/projects", { project })
      : await api("PUT", "/api/projects/" + encodeURIComponent(d.file), { project, expect: d.version });
    S = normalize(r.state); saving = false; closeDrawer(true);
    toast(d.mode === "new" ? t("pe.created", { n: project.name }) : t("t.saved"));
    go("#/projects/" + encodeURIComponent(r.file));
  } catch (e) {
    saving = false;
    if (e.status === 409) { toast(t("t.conflict"), true); await loadState(true); }
    if (drawer) drawer.error = e.status === 409 ? t("t.conflict") : t("t.error", { e: e.message });
    renderDrawerKeepScroll();
  }
}
async function deleteProjectDrawer() {
  const d = drawer;
  if (!d.armed) { d.armed = true; syncProject(); renderDrawerKeepScroll(); return; }
  try {
    const r = await api("DELETE", "/api/projects/" + encodeURIComponent(d.file), { expect: d.version });
    S = normalize(r.state); toast(t("t.deleted", { n: d.form.name })); closeDrawer(true); go("#/projects");
  } catch (e) { toast(e.status === 409 ? t("t.conflict") : t("t.error", { e: e.message }), true); await loadState(true); }
}

// ---------------------------------------------------------------- build (use parts from stock)
function openBuild(p) {
  const picks = [];
  p.rows.forEach((r, ri) => r.from.forEach((f) => picks.push({ ri, id: f.id, name: f.name, take: f.take, unit: r.unit, need: r.need, on: !r.optional })));
  drawer = { kind: "build", file: p.file, name: p.name, how: "deduct", picks, dirty: false };
  renderDrawer(); showDrawer("[name=how]");
}
function renderBuildDrawer() {
  const d = drawer;
  const list = d.picks.length ? d.picks.map((pk, i) => `<label class="check build-row"><input type="checkbox" data-pick="${i}" ${pk.on ? "checked" : ""}>
      <span class="grow"><b>${esc(pk.name)}</b><br><span class="muted">${esc(pk.need)}</span></span>
      <span class="qty-ro">${d.how === "deduct" ? "−" : ""}${fmtNum(pk.take)} <small>${esc(unitLabel(pk.unit))}</small></span></label>`).join("")
    : `<div class="empty-mini">${esc(t("bd.none"))}</div>`;
  $("#drawer").innerHTML = `
    <div class="drawer-h">${icon("tools")}<h2>${esc(t("bd.title", { n: d.name }))}</h2><button class="icon-btn" data-act="close" aria-label="${esc(t("d.close"))}">${icon("x")}</button></div>
    <form class="drawer-b" id="buildForm" novalidate>
      <p class="muted" style="margin:0">${esc(t("bd.intro"))}</p>
      <label class="check"><input type="radio" name="how" value="deduct" ${d.how === "deduct" ? "checked" : ""}><span><b>${esc(t("bd.deduct"))}</b><br><span class="muted">${esc(t("bd.deduct.hint"))}</span></span></label>
      <label class="check"><input type="radio" name="how" value="inuse" ${d.how === "inuse" ? "checked" : ""}><span><b>${esc(t("bd.inuse"))}</b><br><span class="muted">${esc(t("bd.inuse.hint", { p: d.name }))}</span></span></label>
      <div class="section-t">${esc(t("bd.parts"))}</div>${list}
    </form>
    <div class="drawer-f"><span class="spacer"></span><button class="btn" data-act="close">${esc(t("d.cancel"))}</button>
      <button class="btn primary" data-act="save" ${saving || !d.picks.some((p) => p.on) ? "disabled" : ""}>${esc(t("bd.confirm"))}</button></div>`;
}
async function confirmBuild() {
  const d = drawer, on = d.picks.filter((p) => p.on);
  if (!on.length || saving) return;
  const changes = [];
  if (d.how === "deduct") {
    const sum = new Map(); for (const p of on) sum.set(p.id, (sum.get(p.id) || 0) + p.take);
    for (const [id, take] of sum) changes.push({ id, delta: -take });
  } else for (const id of new Set(on.map((p) => p.id))) changes.push({ id, set: { in_use: d.name } });
  saving = true;
  try { const r = await api("POST", "/api/stock/adjust", { changes }); S = normalize(r.state); saving = false; closeDrawer(true); renderShell(); toast(t(d.how === "deduct" ? "bd.done.deduct" : "bd.done.inuse", { n: changes.length })); }
  catch (e) { saving = false; toast(t("t.error", { e: e.message }), true); await loadState(true); }
}

// Shopping-list row -> stock: raise an item you already have, or create a new one prefilled from the need.
function restock(p, ri) {
  const r = p.rows[ri], need = p.needs?.[ri] || {}, missing = Math.max(0, r.qty - r.got);
  const have = r.from[0] && S.items.find((i) => i.id === r.from[0].id);
  if (have) { openDrawer("edit", have); drawer.form.qty = Number(have.qty || 0) + missing; drawer.dirty = true; renderDrawer(); return; }
  const m = need.match || {}, file = guessFile(m) || "electronics";
  const pre = { _file: file, name: need.name || "", qty: missing, unit: need.unit && need.unit !== (file === "filament" ? "g" : "pcs") ? need.unit : undefined,
    category: m.category, material: m.material, color: m.color, finish: m.finish, brand: m.brand, tags: m.tags, specs: m.specs };
  if (need.id) pre.id = need.id;
  openDrawer("new", null, pre);
}

// ---------------------------------------------------------------- settings
function settingsView() {
  const a = S.admin;
  const row = (label, value, action = "") => `<div class="set-row"><div class="set-l">${esc(label)}</div><div class="set-v">${value}</div><div class="set-a">${action}</div></div>`;
  const code = (s) => `<code class="path">${esc(s)}</code>`;
  const skill = a ? { installed: ["b-ok", t("st.skill.ok")], missing: ["b-warn", t("st.skill.missing")], other: ["b-warn", t("st.skill.other")] }[a.skill] : null;
  const val = ui.validate;
  return `<div class="settings">
    <section class="panel"><div class="panel-h"><h2>${esc(t("st.appearance"))}</h2></div>
      ${row(t("lang"), `<div class="seg"><button data-lang="sv" aria-pressed="${lang === "sv"}">Svenska</button><button data-lang="en" aria-pressed="${lang === "en"}">English</button></div>`)}
      ${row(t("theme"), `<div class="seg">${["auto", "light", "dark"].map((m) => `<button data-theme-set="${m}" aria-pressed="${theme === m}">${icon(m === "light" ? "sun" : m === "dark" ? "moon" : "auto")}${esc(t("theme." + m))}</button>`).join("")}</div>`)}
    </section>
    ${a ? `<section class="panel"><div class="panel-h"><h2>${esc(t("st.data"))}</h2></div>
      ${row(t("st.dataDir"), code(a.dataDir) + `<small class="muted">${esc(t("st.dataDir.hint"))}</small>`, `<button class="btn sm" data-copy="${esc(a.dataDir)}">${icon("copy")}${esc(t("st.copy"))}</button>`)}
      ${row(t("st.check"), val ? (val.errors.length ? `<div class="form-err">${val.errors.map(esc).join("<br>")}</div>` : `<span class="badge b-ok">${esc(t("st.check.ok", { n: val.count }))}</span>`) : `<span class="muted">${esc(t("st.check.hint"))}</span>`,
        `<button class="btn sm" data-act="admin:validate">${esc(t("st.check.run"))}</button>`)}
      ${row(t("st.cad"), (S.cad.dir ? code(S.cad.dir) : "") + `<small class="muted">${S.cad.exists === false ? `<span class="badge b-warn">${esc(t("st.cad.nodir"))}</span> ` : ""}${esc(t("st.cad.count", { n: Object.keys(S.cad.components).length, l: S.items.filter((i) => i.cad_component && S.cad.components[i.cad_component]).length }))}${a.cadWarnings?.length ? ` · <span class="badge b-warn" title="${esc(a.cadWarnings.join("\n"))}">${esc(t("st.cad.warn", { n: a.cadWarnings.length }))}</span>` : ""}</small><small class="muted">${esc(t("st.cad.hint"))}</small>`,
        `<button class="btn sm" data-act="nav:attention/nocad">${esc(t("st.cad.show"))}</button>`)}
      ${row(t("st.snapshot"), code(a.snapshot) + `<small class="muted">${esc(t("st.snapshot.hint"))}</small>`, `<button class="btn sm" data-act="admin:snapshot">${esc(t("st.snapshot.run"))}</button>`)}
    </section>
    <section class="panel"><div class="panel-h"><h2>${esc(t("st.ai"))}</h2></div>
      <div class="hint" style="padding-top:12px">${esc(t("st.ai.intro"))}</div>
      ${row(t("st.skill"), `<span class="badge ${skill[0]}">${esc(skill[1])}</span> ${code(a.skillPath)}`, `<button class="btn sm ${a.skill === "installed" ? "" : "primary"}" data-act="admin:skill">${esc(a.skill === "installed" ? t("st.skill.update") : t("st.skill.install"))}</button>`)}
    </section>` : `<section class="panel"><div class="hint">${esc(t("ro.banner"))} <code>node inv.mjs app</code></div></section>`}
    <section class="panel"><div class="panel-h"><h2>${esc(t("st.keys"))}</h2></div>
      ${row(t("st.key.search"), "<kbd>/</kbd>")}${row(t("st.key.new"), "<kbd>N</kbd>")}${row(t("st.key.save"), "<kbd>Ctrl</kbd> + <kbd>Enter</kbd>")}${row(t("st.key.close"), "<kbd>Esc</kbd>")}
    </section>
    ${a ? `<div class="muted" style="font-size:12px;padding:4px 2px">maker-inventory · Node ${esc(a.node)} · ${esc(a.toolDir)}</div>` : ""}
  </div>`;
}
async function adminAction(what) {
  try {
    if (what === "validate") { ui.validate = await api("POST", "/api/admin/validate", {}); renderContent(); }
    else if (what === "snapshot") { await api("POST", "/api/admin/snapshot", {}); toast(t("st.snapshot.done")); }
    else if (what === "skill") { const r = await api("POST", "/api/admin/install-skill", {}); S = normalize(r.state); renderShell(); toast(t("st.skill.done")); }
  } catch (e) { toast(t("t.error", { e: e.message }), true); }
}

// ---------------------------------------------------------------- live sync
async function loadState(quiet) {
  if (!LIVE) return;
  try { S = normalize(await api("GET", "/api/state")); renderShell(); if (!quiet) toast(t("t.reloaded")); }
  catch { toast(t("t.offline"), true); }
}
let offline = false;
async function poll() {
  if (!LIVE || document.hidden || saving) return;
  try {
    const { version } = await api("GET", "/api/version");
    offline = false;
    if (version !== S.version) {
      const focusId = document.activeElement?.id;
      await loadState(!!drawer);
      if (focusId === "q") { const q = $("#q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  } catch { if (!offline) { offline = true; toast(t("t.offline"), true); } }
}

// ---------------------------------------------------------------- toasts
function toast(msg, err) {
  const el = document.createElement("div");
  el.className = "toast" + (err ? " err" : ""); el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), err ? 6000 : 2600);
}

// ---------------------------------------------------------------- events
document.addEventListener("click", (e) => {
  const tEl = e.target;
  const stepBtn = tEl.closest("[data-step]");
  if (stepBtn) { e.stopPropagation(); step(stepBtn.dataset.id, Number(stepBtn.dataset.step)); return; }
  if (tEl.closest("[data-stop]")) return;
  const langBtn = tEl.closest("[data-lang]");
  if (langBtn) {
    const prevLang = lang;
    if (drawer?.kind === "project") syncProject();
    lang = langBtn.dataset.lang; store.set("lang", lang); document.documentElement.lang = lang; renderShell();
    if (drawer?.kind === "item") { syncForm(); localizeForm(drawer.form, drawer.file); }
    if (drawer?.kind === "project" && prevLang !== lang) drawer.form.needs = drawer.form.needs.map((n) => ({ ...n, ...relabelNeed(n) }));
    if (drawer) renderDrawerKeepScroll();
    return;
  }
  const copyBtn = tEl.closest("[data-copy]");
  if (copyBtn) { navigator.clipboard?.writeText(copyBtn.dataset.copy).then(() => toast(t("st.copied"))); return; }
  const nmode = tEl.closest("[data-nmode]");
  if (nmode) { syncProject(); const n = drawer.form.needs[Number(nmode.closest(".need-card").dataset.ni)]; n.mode = nmode.dataset.nmode; drawer.dirty = true; renderDrawerKeepScroll(); return; }
  const rmNeed = tEl.closest("[data-rmneed]");
  if (rmNeed) { syncProject(); drawer.form.needs.splice(Number(rmNeed.dataset.rmneed), 1); drawer.dirty = true; renderDrawerKeepScroll(); return; }
  const themeBtn = tEl.closest("[data-theme-set]");
  if (themeBtn) { theme = themeBtn.dataset.themeSet; store.set("theme", theme); applyTheme(); renderShell(); return; }
  const sortTh = tEl.closest("[data-sort]");
  if (sortTh) { const k = sortTh.dataset.sort; ui.sort = { key: k, dir: ui.sort.key === k ? -ui.sort.dir : 1 }; renderContent(); return; }
  const cat = tEl.closest("[data-cat]");
  if (cat) { ui.category = cat.dataset.cat; renderContent(); return; }
  const rmTag = tEl.closest("[data-rmtag]");
  if (rmTag) { syncForm(); drawer.form.tags.splice(Number(rmTag.dataset.rmtag), 1); drawer.dirty = true; renderDrawerKeepScroll(); return; }
  const rmSpec = tEl.closest("[data-rmspec]");
  if (rmSpec) { syncForm(); const k = $(`[data-spec-k="${rmSpec.dataset.rmspec}"]`).value.trim(); delete drawer.form.specs[k]; drawer.dirty = true; renderDrawerKeepScroll(); return; }
  if (tEl.closest("#tagsBox")) { $("#tagIn")?.focus(); }
  const cadBtn = tEl.closest("[data-cadlink]");
  if (cadBtn && drawer?.kind === "item") { syncForm(); drawer.form.cad_component = cadBtn.dataset.cadlink; drawer.dirty = true; renderDrawerKeepScroll(); return; }
  const altBtn = tEl.closest("[data-alts]");
  if (altBtn) { const k = altBtn.dataset.alts; ui.altsOpen.has(k) ? ui.altsOpen.delete(k) : ui.altsOpen.add(k); renderContent(); return; }
  // project planning
  const pp = curProj();
  const rmTodo = tEl.closest("[data-rmtodo]");
  if (rmTodo && pp) { savePlan(pp, { todos: pp.todos.filter((_, i) => i !== Number(rmTodo.dataset.rmtodo)) }); return; }
  const rmLink = tEl.closest("[data-rmlink]");
  if (rmLink && pp) { savePlan(pp, { links: pp.links.filter((_, i) => i !== Number(rmLink.dataset.rmlink)) }); return; }
  const imgBtn = tEl.closest("[data-img]");
  if (imgBtn) { ui.lightbox = Number(imgBtn.dataset.img); ui.lbArmed = false; renderLightbox(); document.querySelector(".lightbox [data-lbclose]")?.focus(); return; }
  if (tEl.closest(".lightbox")) {
    const go1 = tEl.closest("[data-lbgo]");
    if (go1 && pp) { ui.lightbox = (ui.lightbox + Number(go1.dataset.lbgo) + pp.images.length) % pp.images.length; ui.lbArmed = false; renderLightbox(); return; }
    if (tEl.closest("[data-lbdel]") && pp) { if (!ui.lbArmed) { ui.lbArmed = true; renderLightbox(); } else deleteImage(pp, ui.lightbox); return; }
    if (tEl.closest("[data-lbclose]") || tEl.matches(".lightbox, .lb-stage")) { ui.lightbox = null; ui.lbArmed = false; renderLightbox(); }
    return;
  }
  const open = tEl.closest("[data-open]");
  if (open && !tEl.closest(".drawer")) { e.preventDefault(); const it = S.items.find((i) => i.id === open.dataset.open); if (it) openDrawer(LIVE ? "edit" : "view", it); return; }
  if (tEl.id === "scrim") { closeDrawer(); return; }
  const act = tEl.closest("[data-act]")?.dataset.act;
  if (!act) return;
  const curProject = () => S.projects.find((x) => x.file === route.project) || S.projects[0];
  if (act === "new") openDrawer("new");
  else if (act === "new-project") openProject("new");
  else if (act === "edit-project") openProject("edit", curProject());
  else if (act === "build-project") openBuild(curProject());
  else if (act === "example-project") api("POST", "/api/projects", { example: true }).then((r) => { S = normalize(r.state); go("#/projects/" + encodeURIComponent(r.file)); }, (e) => toast(t("t.error", { e: e.message }), true));
  else if (act.startsWith("restock:")) restock(curProject(), Number(act.slice(8)));
  else if (act === "add-need") { syncProject(); drawer.form.needs.push(needToForm({})); drawer.dirty = true; renderDrawerKeepScroll(); const cards = document.querySelectorAll(".need-card"); cards[cards.length - 1]?.scrollIntoView({ block: "nearest" }); cards[cards.length - 1]?.querySelector("[data-nf=name]")?.focus(); }
  else if (act.startsWith("admin:")) adminAction(act.slice(6));
  else if (act === "close") closeDrawer();
  else if (act === "save") saveDrawer();
  else if (act === "delete") deleteCurrent();
  else if (act === "copy-shop") {
    const p = S.projects.find((x) => x.file === route.project) || S.projects[0];
    navigator.clipboard?.writeText(shoppingMarkdown(p)).then(() => toast(t("proj.copied")), () => toast(shoppingMarkdown(p)));
  } else if (act.startsWith("nav:")) { query = ""; go("#/" + act.slice(4)); }
});
// Navigate; hashchange doesn't fire for the current hash, so render directly then.
function go(hash) {
  if (location.hash === hash || (hash === "#/" && !location.hash)) { route = parseRoute(); renderShell(); }
  else { location.hash = hash; route = parseRoute(); ui.category = ""; ui.attention = false; renderShell(); }
}

document.addEventListener("input", (e) => {
  if (e.target.id === "q") { query = e.target.value; if (route.page === "dashboard" || route.page === "file") { renderContent(); $("#app h1").textContent = route.page === "dashboard" ? (query ? t("results") : t("nav.dashboard")) : fileLabel(route.file); } return; }
  if (drawer?.kind === "project" && e.target.closest("#projForm")) { drawer.dirty = true; drawer.armed = false; return; }
  if (!drawer || !e.target.closest("#itemForm")) return;
  drawer.dirty = true; drawer.armed = false;
  const n = e.target.name;
  if (n === "id") drawer.idTouched = true;
  if (["name", "material", "color", "finish", "brand"].includes(n)) { drawer.form[n] = e.target.value; autoId(); }
  if (n === "color") {
    e.target.parentElement.querySelector(".sw").outerHTML = swatch(e.target.value);
    $("#drawer .drawer-h .sw")?.replaceWith(Object.assign(document.createElement("template"), { innerHTML: swatch(e.target.value, true) }).content);
  }
  if (drawer.file === "filament" && ["material", "color"].includes(n)) {
    const nameEl = $("#itemForm [name=name]"); if (nameEl) nameEl.placeholder = filamentTitle({ ...drawer.form, name: "" });
  }
  if (e.target.dataset.specK !== undefined || e.target.dataset.specV !== undefined) {
    const rows = document.querySelectorAll(".kv .r"); const last = rows[rows.length - 1];
    if (last && [...last.querySelectorAll("input")].some((i) => i.value)) { syncForm(); renderDrawerKeepScroll(); const sel = `[data-spec-${e.target.dataset.specK !== undefined ? "k" : "v"}="${e.target.dataset.specK ?? e.target.dataset.specV}"]`; const el = $(sel); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "attn") { ui.attention = e.target.checked; renderContent(); return; }
  const pp = curProj();
  if (pp && e.target.dataset.todo !== undefined) { const i = Number(e.target.dataset.todo); savePlan(pp, { todos: pp.todos.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) }); return; }
  if (pp && e.target.dataset.status !== undefined) { savePlan(pp, { status: e.target.value }); return; }
  if (pp && e.target.dataset.upload !== undefined) { const files = [...e.target.files]; e.target.value = ""; uploadImages(files); return; }
  if (pp && e.target.dataset.caption !== undefined) { const i = ui.lightbox; savePlan(pp, { images: pp.images.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) }); return; }
  if (drawer?.kind === "build") {
    if (e.target.name === "how") drawer.how = e.target.value;
    if (e.target.dataset.pick !== undefined) drawer.picks[Number(e.target.dataset.pick)].on = e.target.checked;
    renderDrawerKeepScroll(); return;
  }
  if (drawer?.kind === "project" && e.target.closest("#projForm")) {
    drawer.dirty = true; drawer.armed = false;
    if (e.target.dataset.rerender !== undefined) { syncProject(); renderDrawerKeepScroll(); }
    if (e.target.dataset.nf === "id" && e.target.value) {
      const card = e.target.closest(".need-card"), nameEl = card.querySelector("[data-nf=name]");
      const it = S.items.find((i) => i.id === e.target.value);
      if (nameEl && !nameEl.value && it) nameEl.value = it._file === "filament" ? filamentTitle(it) : it.name;
    }
    return;
  }
  if (drawer && e.target.name === "_file") { syncForm(); drawer.file = e.target.value; drawer.form._file = drawer.file; drawer.dirty = true; autoId(); renderDrawerKeepScroll(); return; }
  if (drawer && e.target.closest("#itemForm")) drawer.dirty = true;
  if (drawer?.kind === "item" && e.target.name === "cad_component") { syncForm(); renderDrawerKeepScroll(); }
});
// Add a to-do or a link from the small forms under each list.
document.addEventListener("submit", (e) => {
  const f = e.target, pp = curProj();
  if (!pp || !f.matches("[data-addtodo], [data-addlink]")) return;
  e.preventDefault();
  if (f.matches("[data-addtodo]")) {
    const text = f.text.value.trim(); if (!text) return;
    savePlan(pp, { todos: [...pp.todos, { text }] }).then((ok) => { if (ok) $("[data-addtodo] input")?.focus(); });
  } else {
    const url = f.url.value.trim(), title = f.title.value.trim(); if (!url) return;
    if (!/^https?:\/\/\S+$/i.test(url)) { toast(t("pl.badUrl"), true); return; }
    savePlan(pp, { links: [...pp.links, { title, url }] });
  }
});
// Pictures: drop files on the pictures panel, or paste one anywhere on a project page.
document.addEventListener("dragover", (e) => { const z = e.target.closest?.("[data-drop]"); if (z && [...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); z.classList.add("drag"); } });
document.addEventListener("dragleave", (e) => { const z = e.target.closest?.("[data-drop]"); if (z && !z.contains(e.relatedTarget)) z.classList.remove("drag"); });
document.addEventListener("drop", (e) => { const z = e.target.closest?.("[data-drop]"); if (!z) return; e.preventDefault(); z.classList.remove("drag"); uploadImages([...(e.dataTransfer?.files || [])]); });
document.addEventListener("paste", (e) => {
  const pp = curProj();
  if (!LIVE || !pp || pp.example || drawer || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
  if (files.length) { e.preventDefault(); uploadImages(files); }
});
document.addEventListener("keydown", (e) => {
  if (ui.lightbox != null && document.querySelector(".lightbox")) {
    if (e.key === "Escape") { ui.lightbox = null; ui.lbArmed = false; renderLightbox(); return; }
    if (e.target.dataset?.caption !== undefined) { if (e.key === "Enter") e.target.blur(); return; }
    const n = curProj()?.images.length || 0;
    if (n > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { ui.lightbox = (ui.lightbox + (e.key === "ArrowRight" ? 1 : -1) + n) % n; ui.lbArmed = false; renderLightbox(); }
    return;
  }
  if (e.target.id === "tagIn" && (e.key === "Enter" || e.key === ",")) {
    e.preventDefault(); const v = e.target.value.trim().replace(/,$/, "");
    if (v) { syncForm(); drawer.form.tags = [...(drawer.form.tags || []), ...v.split(/\s*,\s*/).filter(Boolean)]; drawer.dirty = true; renderDrawerKeepScroll(); $("#tagIn")?.focus(); }
    return;
  }
  if (e.target.id === "tagIn" && e.key === "Backspace" && !e.target.value && drawer?.form.tags?.length) { syncForm(); drawer.form.tags.pop(); renderDrawerKeepScroll(); $("#tagIn")?.focus(); return; }
  if (drawer && e.key === "Escape") { closeDrawer(); return; }
  if (drawer && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDrawer(); return; }
  if (drawer && e.key === "Enter" && e.target.tagName === "INPUT" && e.target.closest("#itemForm, #projForm, #buildForm")) { e.preventDefault(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (!typing && e.key === "/") { e.preventDefault(); $("#q")?.focus(); }
  if (!typing && LIVE && e.key.toLowerCase() === "n" && !drawer && !e.ctrlKey && !e.metaKey && route.page !== "settings") { e.preventDefault(); route.page === "projects" ? openProject("new") : openDrawer("new"); }
  if (e.target.id === "q" && e.key === "Escape") { query = ""; e.target.value = ""; renderContent(); }
});
window.addEventListener("hashchange", () => { ui.lightbox = null; renderLightbox(); route = parseRoute(); ui.category = ""; if (route.page !== "file") ui.attention = false; renderShell(); });
window.addEventListener("beforeunload", (e) => { if (drawer?.dirty) { e.preventDefault(); e.returnValue = ""; } });

// ---------------------------------------------------------------- boot
document.documentElement.lang = lang;
document.body.insertAdjacentHTML("beforeend", '<div id="scrim" class="scrim"></div><aside id="drawer" class="drawer"></aside><div id="toasts" class="toasts" aria-live="polite"></div>');
renderShell();
// A server started before an update can serve new page code without the vocabulary. Say so instead of showing wrong colors.
if (!window.__VOCAB__) document.body.insertAdjacentHTML("afterbegin", `<div class="stale-banner" role="alert">${icon("alert")}<span>${esc(t("stale"))}</span></div>`);
if (LIVE) { loadState(true); setInterval(poll, 3000); document.addEventListener("visibilitychange", poll); }
})();
