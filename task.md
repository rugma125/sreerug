# Execution Plan: Modern Calculator Web Application

Based on Product Requirements Document (`prd.md`)

---

## Phase 1: Project Setup & Core Math Engine Architecture

- [x] **1.1 Initialize Project Structure**
  - Create standard lightweight web application structure:
    - `index.html` — Main UI layout and semantic structure
    - `styles.css` — CSS Design system, responsive layouts, glassmorphism/dark mode styles
    - `js/engine.js` — Core mathematical evaluation engine, tokenizer, and expression parser
    - `js/app.js` — UI state management, event listeners, keyboard handling, and history state
- [x] **1.2 Develop Core Mathematical Engine (`js/engine.js`)**
  - Implement Expression Tokenizer (numbers, operators, functions, parens, constants).
  - Implement Evaluator respecting standard operator precedence:
    - Grouping `()` $\rightarrow$ Functions & Exponents (`^`, `√`, `x²`, `sin`, `cos`, `tan`, `log`, `ln`, `x!`) $\rightarrow$ Multiplication/Division (`×`, `÷`) $\rightarrow$ Addition/Subtraction (`+`, `−`).
  - Implement Basic Arithmetic:
    - Addition (`+`), Subtraction (`−`), Multiplication (`×`), Division (`÷`).
    - Percentage (`%`): In-context (e.g., `200 + 10% = 220`) and standalone (`50% = 0.5`).
    - Sign inversion (`+/−` toggle and unary minus).
    - Decimal validation (maximum 1 decimal point per operand).
    - Auto-closing unmatched open parentheses on evaluation (`=`).
  - Implement Scientific Operations:
    - $\sqrt{x}$, $x^y$, $x^2$, $1/x$, $\sin(x)$, $\cos(x)$, $\tan(x)$, $\log_{10}(x)$, $\ln(x)$, Constant $\pi$ ($3.14159265358979$), Factorial ($x!$).
    - Angle mode support: `DEG` (default) vs `RAD` conversion for $\sin$, $\cos$, $\tan$.
- [x] **1.3 Robust Error Handling & Domain Guard Checks**
  - Division by zero $\rightarrow$ `"Cannot divide by zero"`
  - $\sqrt{x}$ where $x < 0$ $\rightarrow$ `"Invalid input for √"`
  - $\log(x)$ or $\ln(x)$ where $x \le 0$ $\rightarrow$ `"Invalid input for log"`
  - $\tan(x)$ at undefined angles (e.g., $90^\circ, 270^\circ$) $\rightarrow$ `"Undefined"`
  - $x!$ where $x < 0$ or non-integer $\rightarrow$ `"Invalid input for factorial"`
  - Invalid syntax (e.g., `5 + + 3`) $\rightarrow$ `"Invalid expression"`
  - Overflow / Out-of-bounds $\rightarrow$ Scientific notation or `"Result too large"` (prevent `Infinity` / `NaN`).

---

## Phase 2: UI Design & Design System (HTML/CSS)

- [x] **2.1 Modern Visual Design System (`styles.css`)**
  - Modern color palette with CSS variables (sleek dark theme, subtle glassmorphism, accent colors for operators/equals).
  - Clean typography (Google Fonts: Inter / Outfit).
  - Responsive flex/grid container layout adapting from mobile ($<480\text{px}$) to tablet/desktop.
- [x] **2.2 Display Area Component**
  - Live expression header line (smaller muted text showing full ongoing expression).
  - Main result display line (large, high-contrast, right-aligned numbers).
  - Dynamic font resizing / scaling logic for long expressions to avoid overflow or clipping.
- [x] **2.3 Keypad Layout & Interactive Buttons**
  - Basic Mode View (numeric pad $0-9$, `.`, `+/−`, `%`, `÷`, `×`, `−`, `+`, `=`, `AC`, `DEL`).
  - Scientific Mode View (expandable row/grid for scientific functions: $\sin, \cos, \tan, \sqrt{}, x^y, x^2, 1/x, \log, \ln, \pi, x!$, `DEG/RAD` toggle).
  - Visually prominent `=` button.
  - Interactive visual feedback on click/touch (subtle scale down, highlight state, active transitions).
  - Touch target compliance (minimum $44 \times 44\text{px}$).
- [x] **2.4 Calculation History Panel UI**
  - Docked side-panel on wide screens ($\ge 768\text{px}$).
  - Collapsible drawer / toggleable tab on mobile screens ($<768\text{px}$).
  - History list view with expression and result per entry.
  - "Clear History" button control.

---

## Phase 3: State Management & UI Wiring (`js/app.js`)

- [x] **3.1 Calculator State Machine**
  - Maintain current expression, current display value, angle mode (`DEG`/`RAD`), active mode (`Basic`/`Scientific`), and last completed operation (for repeat `=` behavior).
  - Operator replacement rule: consecutive operator inputs (e.g. `5 + *`) replace the previous operator (`5 *`).
- [x] **3.2 Control Buttons Implementation**
  - `AC` (All Clear): Resets current expression and display to zero without touching history.
  - `DEL` / Backspace: Removes the last character token. Default to `0` if display becomes empty.
  - Mode Toggle (`Basic ⇄ Scientific`): Toggles scientific panel visibility without clearing calculation.
  - Angle Toggle (`DEG ⇄ RAD`): Toggles trigonometric angle state.
  - `=` (Evaluate): Executes calculation via Math Engine, updates display, records to history, and enables operation repeating.
- [x] **3.3 Calculation History Feature**
  - Automatically record resolved expressions and results to history array on `=`.
  - Tap-to-recall: Clicking any history item populates display with that result for continued calculation.
  - Clear History button empties session history list.

---

## Phase 4: Full Keyboard Support & Accessibility (a11y)

- [x] **4.1 Keyboard Input Integration**
  - Global `keydown` listeners mapping:
    - `0–9`, `.`, `+`, `-`, `*`, `/`, `(`, `)`, `%`
    - `Enter` or `=` $\rightarrow$ Evaluate expression
    - `Backspace` $\rightarrow$ Delete last character
    - `Escape` $\rightarrow$ All Clear (`AC`)
  - Mirror visual active states on keyboard presses to match touch/click feedback.
- [x] **4.2 Accessibility & ARIA Support**
  - Add explicit `aria-label` attributes to all buttons (e.g., `aria-label="Divide"`, `aria-label="Square root"`).
  - Sequential `tabindex` and visible outline focus indicators for complete keyboard navigation.
  - High contrast ratio compliance (WCAG AA minimum).

---

## Phase 5: Verification, Edge Case QA & Final Polish

- [x] **5.1 Mathematical Engine Edge Case Testing**
  - Verify precedence rules (e.g., `2 + 3 * 4 = 14`, `(2 + 3) * 4 = 20`).
  - Verify percentage edge cases (`200 + 10% = 220`, `50% = 0.5`).
  - Verify domain errors ($\sqrt{-1}$, $5/0$, $\log(-5)$, $1.5!$).
  - Verify precision & scientific notation for large/small numbers.
- [x] **5.2 Cross-Device & Responsive Testing**
  - Mobile portrait and landscape layout verification (no horizontal scroll, min target sizes).
  - Desktop responsive layout verification (history panel docked side-by-side).
- [x] **5.3 Acceptance Criteria Audit**
  - Run full audit against all 12 criteria specified in Section 7 of `prd.md`.
