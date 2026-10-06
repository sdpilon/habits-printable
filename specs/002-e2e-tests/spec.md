# Feature Specification: Automated End-to-End Tests

**Feature Branch**: `002-e2e-tests`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "setup automated e2e tests"

## Clarifications

### Session 2026-10-06

- Q: Should the download checks also run on US Letter paper, not only the default A4? → A: Drop A4. The suite tests only US Letter, because that is the only paper size the operator uses. The A4 default stays a product requirement (constitution Technical Constraints) but is not covered by these tests.
- Q: How long should the suite wait for the preview to finish updating before it treats the wait as a failure? → A: 5 seconds.
- Q: When one scenario fails, should the suite keep running the remaining scenarios or stop there? → A: Run every scenario and report every failure in the same run.
- Q: Should the suite test the production build of the page, or the development server? → A: Production build, served locally.

### Session 2026-10-05

- Q: Which user-facing behavior do the end-to-end tests cover? → A: The complete path a person takes in the web page: choosing options, seeing the preview update, being blocked by invalid or overflowing options, and downloading the PDF. Unit and comparison checks already cover the layout and margin logic, so the end-to-end tests cover only what happens in the browser.
- Q: Where do the tests run? → A: On the developer's own machine, started by one command on demand. The project has no git remote yet, so a hosted pipeline is not required by this feature. Running on a hosted pipeline later is a follow-on decision.
- Q: Which browsers? → A: One current desktop Chromium-based browser for the first version. Other browsers are a follow-on decision, because the printable output must match across browsers and that comparison is not yet defined.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirm the download path works end to end (Priority: P1)

A developer changes the page, the layout code, or the options, and runs one command. The test opens the real page in a browser, sets valid options, waits for the preview, downloads the PDF, and checks that the file is a single-page US Letter PDF. If any step fails, the developer sees which step failed and a screenshot of the page at that moment.

**Why this priority**: The download is the product's only output. A regression here means no usable paper, so this is the minimum useful test.

**Independent Test**: Run the single end-to-end command on a clean checkout with the default options. The run passes when the downloaded file opens as a one-page PDF and the test reports success. Changing the download code so that it produces no file must make the run fail.

**Acceptance Scenarios**:

1. **Given** the page is open with default options, **When** the test waits for the preview and presses download, **Then** a PDF file is saved whose page size is US Letter and whose page count is one.
2. **Given** the page is open, **When** the test sets a non-default habit count, days count, and layout, **Then** the preview shows a grid whose visible habit count and day count match the chosen values.
3. **Given** a successful run, **When** the test finishes, **Then** the report lists each scenario as passed, with no scenario skipped without a stated reason.

---

### User Story 2 - Catch preview and option regressions (Priority: P2)

A developer changes option handling or the preview. The end-to-end tests change each option, check that the preview updates without any apply action, and check that invalid values (empty, zero, negative, non-numeric, over the maximum) show a clear message and leave download unavailable.

**Why this priority**: These are the rules that stop wasted paper and misleading previews (constitution Principle IV). They are the next most likely regressions after the download itself.

**Independent Test**: Run the end-to-end command after deliberately breaking the invalid-value message. The run must fail on the invalid-value scenario and name the input that was tested.

**Acceptance Scenarios**:

1. **Given** the page is open, **When** the test changes each option in turn, **Then** the preview changes after each change without pressing any apply control.
2. **Given** the page is open, **When** the test enters each invalid value kind (empty, zero, negative, non-numeric, above maximum) into the habit count, **Then** a clear message appears for each one and download is unavailable each time.
3. **Given** an invalid value was shown, **When** the test corrects it to a valid value, **Then** the message clears and download becomes available again.

---

### User Story 3 - Catch overflow blocking across layouts (Priority: P3)

A developer changes the fit logic or a layout. The end-to-end tests set option combinations that do not fit on one page and check that the overflow warning appears and download is blocked, for each of the three layouts.

**Why this priority**: The no-pagination rule (FR-013) is a product promise, but the unit tests already cover the fit arithmetic. The browser check confirms that the warning and the blocked download reach the person.

**Independent Test**: Run the end-to-end command with one overflowing combination per layout. Each must show the warning and no download. Removing the warning for one layout must fail that layout's scenario.

**Acceptance Scenarios**:

1. **Given** an option combination that overflows one page in layout (1), **When** the test selects it, **Then** an overflow warning appears and download is unavailable.
2. **Given** the same kind of overflow in layout (2), **When** the test selects it, **Then** the same warning and blocked download appear, and no side-by-side columns are created.
3. **Given** an overflowing combination, **When** the test reduces the habit count until the tracker fits, **Then** the warning clears and download becomes available.

---

### Edge Cases

- The preview is still rendering when the test presses download. The test must wait for the preview to finish, not press download on a stale preview, and must fail if the preview has not settled within 5 seconds.
- The browser blocks or does not save the download. The run must report this as a failure with the step name, not as a pass with no file.
- The local production build cannot be built or served. The run must stop before any scenario starts and say that the page could not be reached.
- Two runs happen at the same time on one machine. Each run must write its files to its own output location so that one run cannot read another run's PDF.
- A previous run left a PDF behind. The run must check the file it just downloaded, not an older one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide one command that runs the end-to-end test suite against the web page, starts the page itself if it is not already running, and exits with a non-zero status when any scenario fails.
- **FR-002**: The suite MUST drive the page the way a person does: it sets options through the page's controls, reads the preview, and presses the download control. It MUST NOT call the layout code directly.
- **FR-003**: The suite MUST verify that the downloaded file is a PDF with the page size US Letter and exactly one page, and it MUST check the file it downloaded in the same run.
- **FR-004**: The suite MUST verify that each option change updates the preview without any apply action.
- **FR-005**: The suite MUST verify that each invalid value kind (empty, zero, negative, non-numeric, above maximum) shows a message and leaves download unavailable, and that a valid value restores download.
- **FR-006**: The suite MUST verify, for each of the three layouts, that an overflowing option combination shows the overflow warning and leaves download unavailable.
- **FR-007**: When a scenario fails, the suite MUST report the scenario name, the step that failed, and save a screenshot of the page at the time of failure.
- **FR-008**: The suite MUST NOT pass a scenario that was skipped or that produced no file; a missing download is a failure.
- **FR-009**: The suite MUST run without any hosted service, account, or network access beyond the locally served production build.
- **FR-010**: A developer MUST be able to run the suite on their own machine by following written setup steps, with no setup beyond those steps.
- **FR-011**: The suite MUST NOT change the layout, the preview, or the download behavior it tests. It only observes and reports.
- **FR-012**: The suite MUST keep its own test files separate from the existing unit, comparison, and performance tests.
- **FR-013**: The suite MUST run every scenario even when an earlier scenario fails, and MUST report every failing scenario in the same run.

### Key Entities *(include if feature involves data)*

- **Scenario**: A named check, such as "invalid habit count is rejected". It has a starting option set, a list of steps, and an expected result.
- **Run report**: The result of one suite execution. It lists each scenario, its pass or fail status, the failing step if any, and the saved screenshots.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can start the complete suite with one command and see a pass or fail result within 3 minutes on a typical development machine.
- **SC-002**: The suite covers 100% of the user-facing behaviors listed in User Stories 1 to 3: the download path, the preview update, the five invalid-value kinds, and the overflow block for each of the three layouts.
- **SC-003**: When a deliberately introduced regression in any covered behavior is present, the suite fails on that behavior in 100% of runs.
- **SC-004**: When the suite passes on an unchanged codebase, it passes in 10 consecutive runs without manual intervention.
- **SC-005**: For every failing scenario, the report names the scenario and the failing step, and includes a screenshot, so a developer can locate the problem without rerunning the suite.

## Assumptions

- The end-to-end tests run on a developer's own machine on demand. Running them in a hosted pipeline is a follow-on decision, because the project has no git remote yet.
- The first version covers one current desktop Chromium-based browser. Other browsers and mobile viewports are out of scope until a follow-on feature defines what must match across them.
- The page is built and served locally by the suite as a production build, which is what people receive. No staging or hosted site is tested.
- The suite checks the page's visible behavior and the downloaded file's page count and size. It does not re-check dot positions or margins; those stay with the existing margin check (constitution Principle II) and unit tests.
- The layout ranges, maximums, and overflow rules come from feature 001 and are not changed here. Scenario values are chosen from those rules.
- Option values for scenarios are fixed in the test code, not generated randomly, so that a failure can be reproduced.
- Existing unit, comparison, and performance tests are unchanged and remain the way those checks run.
