# Incrementor
This is a simple package to increment and release versions to git in a project's `package.json` file based on [Semver](https://semver.org/).

## Installation
NPM:
`npm install --save-dev incrementor`

Yarn:
`yarn add incrementor --dev`

## Usage
In your project's `package.json` file, add an entry to `scripts`:
```
"scripts": {
  "release": "incrementor"
}
```

Make changes and commits as you normally would, then:
```
npm run release -- patch "* Big improvements" "* Maximum performance"
```

Or, for Yarn:
```
yarn release patch "* Big improvements" "* Maximum performance"
```

That's it! Incrementor will:
- Increase the version in `package.json`
- Commit the change with the version number as the first line of the message
  - Optionally: add any further lines to the commit message
- Tag the commit as the new version
- Push your changes and new tag

## Important Note!
If you `git checkout` a new branch and don't have changes on a remote, this process will fail.
