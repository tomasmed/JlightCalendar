# Feature Specification: Calendar Galaxies & Inhabitant Management

## 1. Executive Summary
**Calendar Galaxies** is the multi-tenant group model of JlightCalendar. Under a celestial theme, each collaborative circle (immediate family, co-parenting unit, extended family with grandparents, or kids activity club) forms a **Galaxy**.

Within each Galaxy, users can:
1. Seamlessly switch their active Galaxy view from the header dropdown.
2. View and schedule events across dedicated **Calendar Instances** (e.g. Primary Orbit, Kids Activities).
3. Assign events to **Inhabitants** (Galaxy Members), which includes authenticated Google users, unlinked profiles (young children and pets like **Java the dog**), or **Everyone** (group-wide events).
4. Perform direct on-click event creation and editing on the calendar grid without artificial UI mode/PIN gates.

---

## 2. Inhabitant Model (Pets & Unlinked Profiles)
Not every family member has a Google email or phone. In particular:
- **Children**: May only have a first name, assigned color badge, and star balance for chores.
- **Pets**: Household companions (e.g. *Java* the golden retriever) have schedules such as vet checkups, grooming, and heartworm medication. They are represented with:
  - `displayName`: e.g. "Java"
  - `role`: `pet`
  - `avatarIcon`: `dog` or `cat`
  - `color`: e.g. `#10b981` (emerald green) or `#f59e0b` (amber)
  - `userId`: `null` (no Google account required)

---

## 3. UI Interactions & Flow

### 3.1 Galaxy Switcher
- Located in the Kiosk Header.
- Displays the currently selected Galaxy (e.g. "The Sol Family Galaxy (Home)") or Ephemeral Comet (`☄️ Comet`).
- Clicking opens a dropdown displaying all Galaxies the user belongs to, along with the Galaxy Join Code (`GLX-XXXXX`), inhabitant count, and "+ Orbit New Galaxy" action.
- Selecting another Galaxy dynamically updates the calendar grid, inhabitant filters, and events without a full page reload.

### 3.2 People & Group Colors Modal (`InhabitantsModal`)
- Accessible from the Galaxy dropdown (`People & Group Colors`) and the `+ People` pill in the calendar filter bar.
- Allows customizing the group-wide **"Everyone"** color/avatar as well as adding, editing, or removing individual members and pets:
  - Name: text input (e.g., "Java", "Grandpa Carl")
  - Role: `admin`, `member`, `kid`, `pet`
  - Avatar Icon: `user`, `baby`, `dog`, `cat`, `sparkles`
  - Color Theme: Vibrant semantic hues adapted automatically to the active Theme Studio palette
- Saving an inhabitant instantly updates the member badges and event assignment options.

### 3.3 Click-to-Add / Edit Events Modal
- Clicking any date cell on the monthly calendar grid, an hour slot in Week/Day view, or "+ Add Event" opens the Event Editor Modal.
- Clicking an existing event card opens the event for modification or deletion (single occurrence or full recurring series).
- Fields: Title, Date (`YYYY-MM-DD`), Start Time, Duration / End Time, Recurrence (`none`, `daily`, `weekday`, `weekly`, `biweekly`, `monthly`), Location, Multi-Member / Everyone Assignment, and Color Override.
