# Lumos Notes (Digital Garden)

A lightweight, static personal “digital garden” with a Bear-style notes browser, plus a few additional views (tasks, music, labs, thought trains). Content is written in Markdown and rendered in the browser.

## Run locally

This repo doesn’t use a package manager; it’s plain HTML/CSS/JS with a tiny Node dev server.

- Start the dev server: `node dev.js`
- Open: `http://localhost:3000`

## Content

- Notes/posts: `posts/*.md` → manifest generated to `posts.js`
- Thought trains: `thought-train/*.md` → manifest generated to `thought-trains.js`
- Labs: `labs/*.md` → manifest generated to `labs.js`
- Tasks: `goals.md`

Generate manifests once (e.g., for a static deploy) with: `node build.js`

## Structure

- UI: `index.html`, `styles.css`
- App logic: `app.js`
- Dev/build tooling: `dev.js`, `build.js`
- Assets: `images/`

## Deploy

Any static host works. Commit the generated `posts.js`, `thought-trains.js`, and `labs.js` (or run `node build.js` in your deploy step), then serve the repository root as static files.
