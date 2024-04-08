# 🔥☁️ Firebase Functions GitHub Action

- Creates a new preview channel (and its associated preview URL) for every PR on your GitHub repository.
- Adds a comment to the PR with the preview URL so that you and each reviewer can view and test the PR's changes in a "preview" version of your app.
- Updates the preview URL with changes from each commit by automatically deploying to the associated preview channel. The URL doesn't change with each new commit.
- (Optional) Deploys the current state of your GitHub repo to your live channel when the PR is merged.

## Setup

A full setup guide can be found [in the Firebase Hosting docs](https://firebase.google.com/docs/hosting/github-integration).

The [Firebase CLI](https://firebase.google.com/docs/cli) can get you set up quickly with a default configuration.

- If you've NOT set up Hosting, run this version of the command from the root of your local directory:

```bash
firebase init hosting
```

- If you've ALREADY set up Hosting, then you just need to set up the GitHub Action part of Hosting.
  Run this version of the command from the root of your local directory:

```bash
firebase init hosting:github
```

## Usage

### Deploy functions on merge

Add a workflow (`.github/workflows/deploy-functions-prod.yml`):

```yaml
name: Deploy Firebase Functions

on:
  push:
    branches:
      - main

jobs:
  deploy_live_website:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: axel-andersson/action-functions-deploy@v1.0
        with:
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          projectId: your-Firebase-project-ID
```

### Deploy functions and hostingon merge

Add a workflow (`.github/workflows/deploy-functions-prod.yml`):

This uses the github action FirebaseExtended/action-hosting-deploy
For information about options and how to use this action, please visit https://github.com/FirebaseExtended/action-hosting-deploy

```yaml
name: Deploy to Live Channel

on:
  push:
    branches:
      - main
    # Optionally configure to run only for specific files. For example:
    # paths:
    # - "website/**"

jobs:
  deploy_live_website:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # Add any build steps here. For example:
      # - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          projectId: your-Firebase-project-ID
          channelId: live
      - uses: axel-andersson/action-functions-deploy@v1.0
      with:
        firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
        projectId: your-Firebase-project-ID
```


## Options

### `firebaseServiceAccount` _{string}_ (required)

This is a service account JSON key. The easiest way to set it up is to run `firebase init hosting:github`. However, it can also be [created manually](./docs/service-account.md).

It's important to store this token as an
[encrypted secret](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
to prevent unintended access to your Firebase project. Set it in the "Secrets" area
of your repository settings and add it as `FIREBASE_SERVICE_ACCOUNT`:
`https://github.com/USERNAME/REPOSITORY/settings/secrets`.

### `projectId` _{string}_

The Firebase project that contains the Hosting site to which you
want to deploy. If left blank, you need to check in a `.firebaserc`
file so that the Firebase CLI knows which Firebase project to use.

### `entryPoint` _{string}_

The directory containing your [`firebase.json`](https://firebase.google.com/docs/cli#the_firebasejson_file)
file relative to the root of your repository. Defaults to `.` (the root of your repo).

### `firebaseToolsVersion` _{string}_

The version of `firebase-tools` to use. If not specified, defaults to `latest`.

## Status

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-blue)

This repository is not maintained by google, nor is it a supported Firebase product. Issues here are answered by maintainers and other community members on GitHub on a best-effort basis.
