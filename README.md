# Compose Builder

This is a UI designer for creating Jetpack Compose layouts.

## **Critical Setup: Firestore Security Rules**

To allow the application to save and load designs from your Firebase project, you **must** update your Firestore security rules.

**Error you might see:** If you see a "Missing or insufficient permissions" error in the browser console, it means you haven't completed the steps below.

### How to Update Firestore Rules:

1.  **Copy the Rules:** Open the `firestore.rules` file in this project and copy its entire content.

2.  **Go to Firebase Console:** Navigate to your project in the [Firebase Console](https://console.firebase.google.com/).
    *   In the left-hand menu, go to **Build > Firestore Database**.
    *   Select the **Rules** tab at the top.

3.  **Paste and Publish:**
    *   Delete the existing content in the editor.
    *   Paste the rules you copied from `firestore.rules`.
    *   Click the **Publish** button.

Once you publish these rules, the application will have the necessary permissions to read and write data.
