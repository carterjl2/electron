const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

// i.e. my-app/app-0.1.13/
const appFolder = path.dirname(process.execPath);

// i.e. my-app/Update.exe
const updateExe = path.resolve(appFolder, '..', 'Update.exe');

const exeName = path.basename(process.execPath);

// Spawn a command and invoke the callback when it completes with an error
// and the output from standard out.
var spawnUpdate = function(args, detached, callback) {
  var error, error1, errorEmitted, spawnedProcess, stderr, stdout;
  try {
    spawnedProcess = spawn(updateExe, args, {
      detached: detached
    });
  } catch (error1) {
    error = error1;

    // Shouldn't happen, but still guard it.
    process.nextTick(function() {
      return callback(error);
    });
    return;
  }
  stdout = '';
  stderr = '';
  spawnedProcess.stdout.on('data', function(data) {
    return stdout += data;
  });
  spawnedProcess.stderr.on('data', function(data) {
    return stderr += data;
  });
  errorEmitted = false;
  spawnedProcess.on('error', function(error) {
    errorEmitted = true;
    return callback(error);
  });
  return spawnedProcess.on('exit', function(code, signal) {

    // We may have already emitted an error.
    if (errorEmitted) {
      return;
    }

    // Process terminated with error.
    if (code !== 0) {
      return callback("Command failed: " + (signal != null ? signal : code) + "\n" + stderr);
    }

    // Success.
    return callback(null, stdout);
  });
};

// Start an instance of the installed app.
exports.processStart = function(callback) {
  return spawnUpdate(['--processStart', exeName], true, function() {});
};

// Download the releases specified by the URL and write new results to stdout.
exports.download = function(updateURL, callback) {
  return spawnUpdate(['--download', updateURL], false, function(error, stdout) {
    var error1, json, ref, ref1, update;
    if (error != null) {
      return callback(error);
    }
    try {

      // Last line of output is the JSON details about the releases
      json = stdout.trim().split('\n').pop();
      update = (ref = JSON.parse(json)) != null ? (ref1 = ref.releasesToApply) != null ? typeof ref1.pop === "function" ? ref1.pop() : void 0 : void 0 : void 0;
    } catch (error1) {
      return callback("Invalid result:\n" + stdout);
    }
    return callback(null, update);
  });
};


// Update the application to the latest remote version specified by URL.
exports.update = function(updateURL, callback) {
  return spawnUpdate(['--update', updateURL], false, callback);
};


// Is the Update.exe installed with the current application?
exports.supported = function() {
  var error1;
  try {
    fs.accessSync(updateExe, fs.R_OK);
    return true;
  } catch (error1) {
    return false;
  }
};
