# Feature Specification: Calendar Galaxies & Inhabitant Management

## 1. Executive Summary
**Calendar Galaxies** is the multi-tenant group model of JlightCalendar. Under a celestial theme, each collaborative circle (immediate family, co-parenting unit, extended family with grandparents, or kids activity club) forms a **Galaxy**.

Within each Galaxy, users can:
1. Seamlessly switch their active Galaxy view from the header dropdown.
2. View and schedule events across dedicated **Calendar Instances** (e.g. Primary Orbit, Kids Activities).
3. Assign events to **Inhabitants** (Galaxy Members), which includes authenticated Google users as well as unlinked profiles (young children and pets like **Java the dog**).
4. Perform on-click event creation and editing directly on the calendar grid when in **Admin Mode** or **Standard Mode** (with **Kid Mode** strictly enforcing read-only view).

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
- Displays the currently selected Galaxy (e.g. "The Sol Family Galaxy (Home)").
- Clicking opens a cosmic dropdown displaying all Galaxies the user is an inhabitant of.
- Displays inhabitant count, celestial badge, and a "+ Orbit New Galaxy" action.
- Selecting another Galaxy dynamically updates the calendar grid, inhabitant filters, and events without a full page reload.

### 3.2 Add & Modify Inhabitants Modal
- Located in the header and member filter bar (available in Admin Mode).
- Allows adding new members/pets:
  - Name: text input (e.g., "Java", "Grandpa Carl")
  - Role: `admin`, `member`, `kid`, `pet`, `viewer`
  - Avatar Icon: `user`, `baby`, `dog`, `cat`, `sparkles`
  - Color Theme: Selection of 8 vibrant celestial hues
- Saving an inhabitant instantly updates the member badges and event assignment dropdowns.

### 3.3 Click-to-Add / Edit Events Modal
- In **Admin Mode** or **Standard Mode**:
  - Clicking any date cell on the monthly calendar grid or clicking "+ Add Event" opens the Event Editor Modal.
  - Clicking an existing event card opens the event for modification or deletion.
  - Fields: Title, Date (YYYY-MM-DD), Start Time, Duration / End Time, Location, Inhabitant Assignment (e.g. Java the dog, Mom, Dad, All Family), and Color Override.
- In **Kid Mode**:
  - Clicking an event displays a read-only detail card.
  - Add, edit, and delete buttons are hidden to prevent accidental schedule changes.
