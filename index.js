#! /usr/bin/env node

const fs = require('fs-extra'),
  path = require('path'),
  exec = require('child_process').exec,
  // This will be relative to where the script is being run from
  projectRoot = process.cwd(),
  targetPackage = path.resolve(projectRoot, 'package.json'),
  // Destructure process.argv into the data we need
  [ , , versionType, ...commitMessages ] = process.argv;

/**
 * setVersion
 * * Handles writing 
 **/
function setVersion(package, version) {
  // Mutate the version
  console.log(`Package version from ${package.version} to ${version}`);
  package.version = version;
  // Overwrite the file
  // xx - get spacing from package
  fs.writeJSONSync(targetPackage, package, { spaces: 2 });
}

/**
 * Main function
 * * Basic validation -> call the other functions -> exit
 */
function increment() {
  if (!versionType && !commitMessage) {
    throw new Error('Usage: incrementor [major/minor/patch] [optional commit message]');
  }
  if (!targetPackage) throw new Error('Could not find package.json at ' + projectRoot);
  if (['major', 'minor', 'patch'].indexOf(versionType) === -1) throw new Error('[versionType] must be "major", "minor", or "patch"');
  const package = fs.readJSONSync(targetPackage);
  if (!package.version || !package.version instanceof String) throw new Error(`Package does not have key 'version'`);
  const oldVersion = package.version;

  // Split and increment the version
  result = () => {
    let [ major, minor, patch ] = package.version.split('.'); // 0.1.2 becomes ['0', '1', '2'];
    let v = {
      major,
      minor,
      patch
    };
    v[versionType] = Number(v[versionType]) + 1; // Patch EX: x.x.3 -> x.x.4 || x.x.9 -> x.x.10
    const joined = Object.keys(v).map(segment => v[segment]);
    return joined.join('.');
  };

  setVersion(package, result());
  handleGit(package.version, package, oldVersion);
}

/**
 * There are libraries for interfacing with git, but they're generally nightmarish to work with;
 * Running straight bash commands is all we need
 */
function handleGit(version, package, oldVersion) {
  let completedStep; // How far we've gotten, used for rolling back on failure
  const mappedMessages = commitMessages.map(msg => `-m "${msg}"`),
    concatMessages = mappedMessages.join(' '),
    commands = {
      add: 'git add package.json',
      commit: `git commit -m v${version}${mappedMessages.length ? ` ${concatMessages}` : ''}`,
      tag: `git tag v${version}`,
      push: 'git push && git push --tags --no-verify'
    },
    handleResult = (error, stdout, stderr, which) => {
      completedStep = which;
      if (error) {
        if (completedStep) return rollback(version, oldVersion, package, completedStep, error);
        // If nothing completed, we failed on add reset package and call it a day
        exec('git reset HEAD package.json');
        setVersion(package, oldVersion);
        throw new Error(error);
      }
      if (stdout) console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
      const commandKeys = Object.keys(commands),
        nextWhich = commandKeys[commandKeys.indexOf(which) + 1];
      // Everything went correctly!
      if (!nextWhich) process.exit(0);
      const next = commands[nextWhich];
      return exec(next, (error, stdout, stderr) => handleResult(error, stdout, stderr, nextWhich));
    };
  exec(commands.add, (error, stdout, stderr) => handleResult(error, stdout, stderr, 'add'));
}

/**
 * Roll back a failed release attempt
 */
function rollback(version, oldVersion, package, completedStep, error) {
  const commands = {
    tag: `git tag --delete v${version}`,
    commit: 'git reset --soft HEAD~1',
    add: 'git reset @ package.json && git checkout @ -- package.json'
  },
    handleResult = (error, stdout, stderr, which) => {
      if (error) throw new error(error);
      if (stdout) console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
      const commandKeys = Object.keys(commands),
        nextWhich = commandKeys[commandKeys.indexOf(which) + 1];
      // Everything went correctly!
      if (!nextWhich) throw new Error(error);
      const next = commands[nextWhich];
      return exec(next, (error, stdout, stderr) => handleResult(error, stdout, stderr, nextWhich));
    };
  exec(commands[completedStep], (error, stdout, stderr) => handleResult(error, stdout, stderr, completedStep));
}

increment();
