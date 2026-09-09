# Publish NoDrafts Housekeeping

This document explains, step by step, how to publish the NoDrafts Housekeeping app in three ways:

1. As a PWA that opens in a web browser and can be installed on a device.
2. As an Android app in the Google Play Store.
3. As an iPhone and iPad app in the Apple App Store.

The explanations are written for someone who is new to app publishing.

## 1. Understand the three publishing options

### PWA

PWA means Progressive Web App. It is the web version of the app. Users open it using a web address in Chrome, Safari, or another browser. They can also choose "Install" or "Add to Home Screen" so it looks like an app on their device.

PWA does not create an Android APK or an iPhone IPA. It creates web files that are deployed to the existing web environment.

### Google Play Store

This is the Android version of the app. Users find it in Google Play and install it like any other Android application.

Google requires an Android release package called an Android App Bundle, with the file extension `.aab`.

### Apple App Store

This is the iPhone and iPad version of the app. Users find it in the Apple App Store and install it through iOS.

Apple requires an iOS release package, normally uploaded through App Store Connect. Expo EAS can create and submit this build for us.

## 2. Current app information

The project is located at:

```text
C:\Users\sindhuj\OneDrive\Documents\housekeeping-app
```

The app already has these identifiers:

```json
{
  "name": "NoDrafts Housekeeping",
  "androidPackage": "com.nodrafts.housekeeping",
  "iosBundleIdentifier": "com.nodrafts.housekeeping"
}
```

### What are these identifiers?

- `name` is the name shown to users.
- `androidPackage` is the unique identity of the Android app. Google Play uses it to recognize the app.
- `iosBundleIdentifier` is the unique identity of the Apple app. Apple uses it to recognize the app.

These identifiers should not be changed after publishing unless there is a strong reason. Changing them can make the store treat the app as a completely new app.

## 3. Things shared by all three publishing options

### Production backend API URL

The frontend app needs a backend server to load and save information such as users, rooms, schedules, incidents, and photos.

During development, the app may use a local address such as `localhost`. That only works on the developer's computer. It will not work for people who install the published app.

Before publishing, the app must use the real production backend URL, for example:

```text
https://api.example.com
```

The exact URL must come from the deployed backend team or backend environment.

### Privacy policy URL

A privacy policy explains what user information the app collects, why it collects it, and how it is protected. Google and Apple normally require a public web link to this document.

The link must open in a browser without requiring the user to log in.

### Support email or support URL

Users and the app stores need a way to contact the support team. Use a real monitored email address or a public support page.

### App icon

The app icon is the image shown on the device home screen and in the app store. It should be a clear square image with the NoDrafts branding.

### Screenshots

Screenshots show users what the app looks like before they install it. They should show the real app, such as login, housekeeping tasks, schedules, room details, and incident reporting.

## 4. Publish the PWA

### What is required?

- The production backend API URL.
- The app icon.
- PWA manifest information.
- Privacy policy URL.
- Support email or support URL.
- The web build generated from this project.
- Access to the existing PWA deployment environment.

### Cost

| Item | Cost |
| --- | ---: |
| PWA build | $0 |

The minimum additional publishing cost for the PWA is `$0`, assuming the existing PWA deployment environment is already available.

### Step 1: Open the project folder

Open PowerShell and move into the project folder:

```powershell
cd C:\Users\sindhuj\OneDrive\Documents\housekeeping-app
```

`cd` means "change directory." It tells PowerShell which project you want to work with.

### Step 2: Install the project packages

Run:

```powershell
npm install
```

This downloads the libraries listed by the project. Libraries are reusable pieces of code required by the app.

Run this when setting up the project on a computer for the first time or after the package list changes.

### Step 3: Run the PWA locally

Run:

```powershell
npm run web
```

This starts a local development server and opens the web version. Check that the app loads and that the important screens work.

This local address is only for testing. It is not the final public app address.

### Step 4: Configure the production backend

Find the configuration used by the frontend for API requests. Replace any local backend address with the production backend URL.

Then test these actions in the local web app:

- Log in.
- Load the dashboard.
- Load schedules.
- Open a room or task.
- Create or update a record if the user has permission.
- Upload a photo if the app supports it.
- Log out.

### Step 5: Build the PWA

Run:

```powershell
npm run build:web
```

This converts the development source code into optimized files that a browser can use in production.

The generated files are placed in:

```text
dist-web\
```

Do not edit files inside `dist-web` manually. Rebuild the app after making source-code changes.

### Step 6: Deploy the generated web files

Upload the contents of `dist-web\` to the existing PWA deployment environment.

The deployment environment is the place where the web files are made available to users. This document does not add a new hosting or domain option because the PWA environment already exists.

### Step 7: Test the published PWA

Open the deployed PWA address and check:

- The page opens without a blank screen.
- Login works.
- The app calls the production backend.
- Schedule data loads.
- Photos and other files work if used.
- Refreshing a page does not break the app.
- Logout works.

Test installation from:

- Android Chrome.
- iPhone Safari using "Add to Home Screen."
- Desktop Chrome using the install button if available.

### Step 8: Publish the PWA address

Once testing passes, give users the deployed PWA address. Users do not need to download the app from a store to use the PWA.

## 5. Publish the Android app in Google Play Store

### What is required?

- Google Play Developer account.
- Expo account for building the app.
- Android production build.
- Android App Bundle file ending in `.aab`.
- App icon.
- Feature graphic.
- Store screenshots.
- Privacy policy URL.
- Support email.
- Data safety answers.
- Content rating answers.
- Production backend API URL.

### Cost

| Item | Cost | Why it is needed |
| --- | ---: | --- |
| Google Play Developer account | $25 one-time | Required to publish apps on Google Play |
| Expo EAS Build free tier | $0, limited builds | Used to create the Android build; subject to current limits |
| Expo EAS Starter | $19/month | Optional paid build plan if the free build limit is not enough |
| Screenshots and icons | $0 if created internally | Store images can be prepared by the team |

Minimum possible cost:

```text
$25 one-time
```

The optional Expo plan is not automatically required. It is only needed if the available free build allowance is insufficient.

### Step 1: Create a Google Play Developer account

Create the account using the organization or person who will own the app.

Google charges a one-time registration fee of `$25`.

This account is needed because Google must know who is responsible for publishing and maintaining the app.

### Step 2: Confirm the Android package name

The current Android package name is:

```text
com.nodrafts.housekeeping
```

This is the permanent technical identity of the Android app. Make sure it is correct before the first release.

### Step 3: Create or log in to an Expo account

Expo is the toolchain used by this project. Expo Application Services, called EAS, can build the Android app in the cloud.

Create or use an Expo account, then install and log in to the EAS command-line tool:

```powershell
npm install -g eas-cli
eas login
```

`eas-cli` is a command-line tool. `eas login` connects this computer to the Expo account.

Configure the project once:

```powershell
eas build:configure
```

### Step 4: Prepare the Android release settings

Before creating the production build, confirm:

- The Android package name is correct.
- The app icon is ready.
- The splash screen is ready.
- A production version code is set.
- The production backend URL is configured.
- Camera and photo permissions have clear explanations if the app uses them.

The version code is an internal number that must increase for every new Android upload. Google uses it to identify a newer build.

### Step 5: Create the Android production build

Run:

```powershell
eas build --platform android --profile production
```

EAS creates a signed production Android build. The result is an `.aab` file.

An App Bundle is not normally installed directly by users. Google Play uses it to generate the correct version for each Android device.

### Step 6: Create the app in Google Play Console

Open Google Play Console and create a new app.

Enter:

- App name: `NoDrafts Housekeeping`.
- Default language.
- App type: App.
- Free or paid choice.
- Contact email.

The Play Console is the website used to upload builds, provide store information, answer policy questions, and publish releases.

### Step 7: Complete the store listing

Add:

- App name.
- Short description.
- Full description.
- App icon.
- Feature graphic.
- Phone and tablet screenshots where applicable.
- Privacy policy URL.
- Support contact.

This information is what users see before installing the app.

### Step 8: Complete Google policy forms

Google asks questions about how the app works. Answer truthfully based on the actual app.

- Data safety explains what data the app collects, shares, and protects.
- Content rating asks about the type of content in the app.
- Target audience identifies the intended users.
- App access instructions tell Google how to log in if the app requires an account.
- Permission declarations explain sensitive permissions if Google requests them.

If Google reviewers need a login, provide a test account with only the access needed for review.

### Step 9: Upload to internal testing

Create an internal testing release and upload the `.aab` file.

Internal testing lets selected people install the app from Google Play before it is public. It is useful for finding problems with login, API access, permissions, and device behavior.

### Step 10: Test the Android app

Test at least:

- Login and logout.
- Schedule list and schedule details.
- Rooms and room details.
- Housekeeping tasks.
- Incident reporting.
- Photo upload.
- Network error handling.
- User permissions.

Fix problems, increase the version code, create a new build, and test again when necessary.

### Step 11: Submit the Android app for production

After internal testing passes, create a production release in Google Play Console and submit it for review.

Google reviews the store listing, app behavior, permissions, and policy information. The app becomes publicly available after Google approves and publishes the release.

## 6. Publish the iOS app in Apple App Store

### What is required?

- Apple Developer Program account.
- App Store Connect access.
- Expo account for building the app.
- iOS production build.
- App icon.
- iPhone and iPad screenshots where applicable.
- Privacy policy URL.
- Support URL.
- App privacy answers.
- Age rating answers.
- TestFlight testing.
- Production backend API URL.
- Demo login for Apple review if login is required.

### Cost

| Item | Cost | Why it is needed |
| --- | ---: | --- |
| Apple Developer Program | $99/year | Required to publish on the Apple App Store |
| Expo EAS Build free tier | $0, limited builds | Used to create the iOS build; subject to current limits |
| Expo EAS Starter | $19/month | Optional paid build plan if the free build limit is not enough |
| Screenshots and icons | $0 if created internally | Store images can be prepared by the team |

Minimum possible cost:

```text
$99/year
```

The Apple Developer fee is paid yearly. The optional Expo plan depends on build usage.

### Step 1: Enroll in the Apple Developer Program

Enroll using the Apple account that will own the app.

Apple charges `$99/year` for the developer program. This membership is required for App Store publishing and TestFlight distribution.

### Step 2: Create the app in App Store Connect

App Store Connect is Apple's website for managing the app, screenshots, store listing, TestFlight builds, and App Review.

Create the app with:

```text
App name: NoDrafts Housekeeping
Bundle ID: com.nodrafts.housekeeping
Platform: iOS
```

The bundle ID must match the app configuration. It is the permanent technical identity of the iOS app.

### Step 3: Log in to Expo EAS

Use the same EAS setup described for Android:

```powershell
npm install -g eas-cli
eas login
eas build:configure
```

EAS handles the iOS build process and can connect to the Apple developer account when required.

### Step 4: Prepare the iOS release settings

Confirm:

- The iOS bundle ID is correct.
- The app icon is ready.
- The splash screen is ready.
- The production backend URL is configured.
- Camera and photo permission text clearly explains why access is needed.
- A new build number is available.

The build number is an internal iOS number. It must increase whenever a new build is uploaded.

### Step 5: Create the iOS production build

Run:

```powershell
eas build --platform ios --profile production
```

EAS creates a production iOS build and prepares it for upload to App Store Connect.

### Step 6: Submit the build to App Store Connect

Run:

```powershell
eas submit --platform ios
```

This uploads the build to Apple. Uploading does not publish the app immediately. The build first appears in App Store Connect and can be tested with TestFlight.

### Step 7: Test with TestFlight

TestFlight is Apple's private testing system. Add internal or external testers and install the build on real iPhones or iPads.

Test:

- Login and logout.
- Schedule list and schedule details.
- Rooms and room details.
- Housekeeping tasks.
- Incident reporting.
- Photo upload.
- Network error handling.
- User permissions.

### Step 8: Complete the App Store listing

Add:

- App description.
- Keywords.
- App icon.
- iPhone screenshots.
- iPad screenshots if required.
- Support URL.
- Privacy policy URL.
- Age rating answers.
- App privacy answers.
- Review notes.
- Demo login credentials if login is required.

Review notes help Apple understand the important flows and test the app correctly.

### Step 9: Submit for Apple App Review

Submit the completed app for review in App Store Connect.

Apple checks the app, listing, permissions, privacy information, and whether the app works as described. The app becomes available after Apple approves it and the release is made available.

## 7. Final cost summary

| Publishing target | Minimum cost | Optional cost |
| --- | ---: | --- |
| PWA | $0 | None added in this document |
| Google Play Store | $25 one-time | Expo EAS Starter at $19/month if the free build allowance is not enough |
| Apple App Store | $99/year | Expo EAS Starter at $19/month if the free build allowance is not enough |

The minimum total is `$25 one-time plus $99/year`, excluding any optional build-plan usage.

## 8. Recommended publishing order

Follow this order because it makes testing easier:

1. Configure and publish the PWA.
2. Confirm the production backend works from the PWA.
3. Create an Android internal testing build.
4. Test the Android app and submit it to Google Play.
5. Create an iOS TestFlight build.
6. Test the iOS app and submit it to Apple.
7. Release the Android app publicly after Google approval.
8. Release the iOS app publicly after Apple approval.

## 9. Final checklist before publishing

- Production backend URL is configured.
- Login works in a production build.
- User permissions work correctly.
- Schedule screens load and save data correctly.
- Room and housekeeping screens work.
- Photo upload works if used.
- Logout works.
- Privacy policy is publicly accessible.
- Support email or URL is active.
- Store screenshots show the real app.
- App icon is ready.
- Google Play account is ready.
- Apple Developer account is ready.
- Internal Android testing is complete.
- TestFlight testing is complete.
- Demo login details are ready for store reviewers.
