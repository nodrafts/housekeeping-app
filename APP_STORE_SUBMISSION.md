# NoDrafts Housekeeping App Store Checklist

## Prepared in the repository

- App name: `NoDrafts Housekeeping`
- Bundle ID: `com.nodrafts.housekeeping`
- Version: `1.0.0`
- Build number: `1`
- iPhone-only configuration
- 1024 x 1024 app icon with no transparency
- Camera and photo-library permission descriptions
- Standard HTTPS encryption declaration
- Privacy Policy: `https://housekeeping-mobileapp.nodrafts.com/privacy.html`
- Support URL: `https://housekeeping-mobileapp.nodrafts.com/support.html`
- Terms: `https://housekeeping-mobileapp.nodrafts.com/terms.html`

Deploy the latest web export before entering these URLs in App Store Connect.

## Ready-to-use App Store listing

- Name: `NoDrafts Housekeeping`
- Subtitle: `Rooms, shifts and hotel tasks`
- Primary category: `Business`
- Keywords: `housekeeping,hotel,rooms,cleaning,shifts,schedule,staff,tasks,compliance,operations`
- Promotional text: `Keep hotel rooms, daily assignments, schedules, compliance work, and team communication together.`
- Copyright: replace `[YEAR] [LEGAL COMPANY NAME]` with the company's current legal details.

### Description

NoDrafts Housekeeping gives hotel employees one place to manage their daily work.

Employees can view assigned rooms and compliance jobs, start and complete room cleaning, follow room checklists, report maintenance or safety issues with optional photos, review their schedule, request shift swaps, and communicate with coworkers.

The app supports English and Spanish. Access is provided by a participating hotel or organization; public account registration is not available.

### App Review notes

NoDrafts Housekeeping is a business app for employees of participating hotels. Employee accounts are created and managed by their employer, so the app does not offer public registration. Please use the review account supplied in App Review Information.

Camera and photo-library access are optional and are used only when an employee chooses to attach an image to an incident report. The app remains usable without granting photo access.

After signing in, choose the review organization and hotel if the supplied account has access to more than one. The main tabs are My rooms, Schedule, Chat, and Profile. Privacy Policy, Terms of Service, and Support are available before login and from Profile after login.

## Founder must provide in App Store Connect

1. Active paid Apple Developer Program membership.
2. App record using bundle ID `com.nodrafts.housekeeping`.
3. Suggested category: `Business`.
4. App description, subtitle, keywords, copyright, and age-rating answers.
5. At least one current iPhone screenshot. Three to five are recommended.
6. Privacy Policy URL and Support URL listed above.
7. App Privacy answers that match the deployed app.
8. App Review contact details and a working demo employee account.
9. Review notes explaining that accounts are provisioned by hotels and that camera/photo access is optional for incident attachments.
10. Pricing and availability. Select the countries where contracted hotels operate.
11. Content-rights declaration and the standard export-compliance answers.
12. A release build uploaded from Xcode or Expo EAS, selected under the App Store version.

## App Privacy starting point

Confirm these answers with the backend owner before publishing:

- Contact Info: name and work email, linked to the user, used for app functionality.
- Identifiers: employee/user ID, linked to the user, used for app functionality and security.
- User Content: chat messages, incident text, and optional photos, linked to the user, used for app functionality.
- Other Data: hotel assignments, housekeeping activity, schedules, and shift requests, linked to the user, used for app functionality.
- Diagnostics: disclose only if production logging or monitoring retains device-level diagnostic data.
- Tracking: `No` unless an SDK is added that tracks users across other companies' apps or websites.

The app does not create employee accounts itself. Hotel administrators provision and manage access.

## Suggested age-rating answers

The normal starting point is `None` for violence, sexual content, gambling, drugs, horror, and mature themes. Chat and employee-submitted incident text/photos are user-generated content, so answer Apple's user-generated-content questions truthfully and confirm the final rating in App Store Connect.

## Before submission

- Replace `feedback@nodrafts.com` if the company wants a dedicated support mailbox.
- Have legal counsel or the company owner approve the policy and terms wording.
- Deploy and open all three public URLs on a phone without signing in.
- Test login, housekeeping, schedule, chat, Spanish, incident photos, and logout on a release build.
- Confirm the production API URLs are used before uploading the build.
- Confirm the support mailbox is monitored and the review account will remain active throughout review.
- Capture screenshots from the final release build with realistic, non-sensitive demo data.
- Complete App Privacy, age rating, content rights, pricing, availability, and App Review Information.
- Upload the build, answer export compliance, submit for review, and keep automatic release off until production is ready.

## Screenshot set

Prepare three to five current iPhone screenshots showing:

1. My rooms with assigned housekeeping and compliance work.
2. Room details with checklist and cleaning timer.
3. Schedule in week view.
4. Team chat.
5. Profile with language and help/legal links.

Do not use real employee, guest, or hotel-sensitive data in store screenshots.
