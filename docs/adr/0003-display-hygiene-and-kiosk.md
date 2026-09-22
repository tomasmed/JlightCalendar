# ADR 0003: 24/7 Display Hygiene, Burn-in Protection & Sleep Scheduling

## Status
Accepted

## Context
Wall-mounted tablets, smart displays, and dedicated touchscreens run continuously 24 hours a day, 7 days a week.
This introduces three critical hardware/software failure modes:
1. **Screen Burn-In & Backlight Degradation**: Static UI elements (calendar grids, clocks, header bars) degrade OLED and LCD panels over time.
2. **Night Disturbances & Power Waste**: A bright screen in a kitchen or hallway disturbs sleep at night and consumes unnecessary power.
3. **Browser Memory Leaks**: Long-running single-page applications (SPAs) on low-spec devices (like Raspberry Pis or older tablets) often experience memory bloat over weeks, leading to UI stutter or browser crashes.

## Decision
Incorporate display hygiene and kiosk endurance features natively into the client:

1. **Automated Night Sleep Schedule**:
   - Configurable schedule (default: 11:00 PM to 6:00 AM).
   - During sleep hours, the display transitions to an ultra-dim, OLED-friendly black ambient screen (displaying only a tiny, low-luminance clock).
   - Any screen touch immediately wakes the display to the main calendar for 60 seconds before returning to sleep.
2. **Burn-in Protection (Pixel Shifting)**:
   - For static ambient screensavers and clocks, the coordinate offsets shift by $\pm 2$ pixels every 10 minutes to prevent pixel retention.
3. **Automated Memory Hygiene (Daily Soft-Reload)**:
   - Client schedules a lightweight state re-initialization / soft-reload during the deep sleep window (e.g. 3:30 AM) when the display is idle.
   - Clears detached DOM nodes, resets browser garbage collection, and ensures weeks/months of uptime without slowdowns.

## Consequences
- **Positive**: Extends hardware lifespan, protects screens, prevents bedroom light pollution, ensures rock-solid 24/7 stability.
- **Negative**: Requires handling wake/sleep timers and touch event listeners cleanly in React lifecycle.
