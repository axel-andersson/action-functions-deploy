/**
 * Copyright 2024 Axel Andersson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ErrorResult } from "./deploy";
import { existsSync, readFileSync } from "fs";
import { exec } from "@actions/exec";

type FirebaseParseSuccessResult = {
  status: "success";
  result: {
    data: any;
  };
};

type DependenciesSuccessResult = {
  status: "success";
  result: {
    directories: string[];
  };
};

type FunctionDirectoriesResult = {
  status: "success";
  result: {
    directories: string[];
  };
};

type InstallResult = {
  status: "success";
  result: {
    directory: string;
  };
};

type FunctionsObject = {
  source: string;
  [key: string]: any;
};

function parseFirebaseJson(): FirebaseParseSuccessResult | ErrorResult {
  try {
    console.log("Parsing 'firebase.json'.");
    const dataString = readFileSync("firebase.json", "utf8");

    console.log(`
    ##### firebase.JSON
       `);
    console.log(dataString);
    console.log(`
    
    
    `);
    var firebaseData = JSON.parse(dataString);
    return { status: "success", result: { data: firebaseData } };
  } catch (e) {
    console.log(e);
    return { status: "error", error: "Could not parse firebase.json" };
  }
}

function getFunctionDirectories(
  firebaseData: any
): FunctionDirectoriesResult | ErrorResult {
  const functionsArray = firebaseData?.functions as any[];

  if (!Array.isArray(functionsArray)) {
    return {
      status: "error",
      error:
        "Unexpected data shape: 'functions' in firebase.json is not an array.",
    };
  }

  try {
    console.log("Getting function directory (directories)");
    const directories = functionsArray.map((item: any) => item.source);

    for (const directory of directories) {
      if (typeof directory !== "string")
        throw Error("Firebase functions source is not a string");
    }

    return {
      status: "success",
      result: { directories },
    } as FunctionDirectoriesResult;
  } catch (e) {
    console.log(e);
    return {
      status: "error",
      error: "Could not find function source in firebase.json",
    };
  }
}

async function installJavascriptDependencies() {
  const installOutputBuffer: Buffer[] = [];
  const installErrorBuffer: Buffer[] = [];
  const cwd = process.cwd();

  try {
    console.log("cwd: " + cwd);

    console.log(`Detected JS/TS: Installing npm dependencies.`);

    await exec("npm ci", [], {
      listeners: {
        stdout: (data: Buffer) => {
          installOutputBuffer.push(data);
        },
        stderr: (data: Buffer) => {
          installErrorBuffer.push(data);
        },
      },
      cwd,
    });

    console.log("");
    console.log(`Listing installed dependencies.`);
    await exec("npm ls", [], { cwd });

    return {
      status: "success",
    };
  } catch (e) {
    console.log(Buffer.concat(installOutputBuffer).toString("utf-8"));
    console.log(Buffer.concat(installErrorBuffer).toString("utf-8"));
    console.log(e.message);
    return {
      status: "error",
      error: `Error when installing npm dependencies: ${e}`,
    };
  }
}

async function installPythonDependencies() {
  const installOutputBuffer: Buffer[] = [];
  const installErrorBuffer: Buffer[] = [];

  const cwd = process.cwd();

  console.log("cwd: " + cwd);

  console.log(`Detected Python: Installing dependencies.`);

  try {
    await exec("python3.11 -m venv venv", [], {
      listeners: {
        stdout: (data: Buffer) => {
          installOutputBuffer.push(data);
        },
        stderr: (data: Buffer) => {
          installErrorBuffer.push(data);
        },
      },
      cwd,
    });

    await exec(". venv/bin/activate", [], {
      listeners: {
        stdout: (data: Buffer) => {
          installOutputBuffer.push(data);
        },
        stderr: (data: Buffer) => {
          installErrorBuffer.push(data);
        },
      },
      cwd,
    });

    await exec("python3.11 -m pip install -r requirements.txt", [], {
      listeners: {
        stdout: (data: Buffer) => {
          installOutputBuffer.push(data);
        },
        stderr: (data: Buffer) => {
          installErrorBuffer.push(data);
        },
      },
      cwd,
    });

    console.log("");
    console.log(`Listing installed dependencies.`);
    await exec("python -m pip list -local", [], { cwd });

    return {
      status: "success",
    };
  } catch (e) {
    console.log(Buffer.concat(installOutputBuffer).toString("utf-8"));
    console.log(Buffer.concat(installErrorBuffer).toString("utf-8"));
    console.log(e.message);
    return {
      status: "error",
      error: `Error when installing npm dependencies: ${e}`,
    };
  }
}

async function installInDir(directory: string) {
  const baseDirectory = process.cwd();
  console.log("Entrypoint directory: " + baseDirectory);

  if (existsSync(directory)) {
    console.log(`Directory '${directory}' found. Continuing installation.`);
  } else {
    return {
      status: "error",
      error: `No directory '${directory}' could be found.`,
    };
  }

  try {
    console.log(`Changing to functions directory: ${directory}`);
    process.chdir(directory);
  } catch (e) {
    return {
      status: "error",
      error: `Error changing to directory: ${directory}.`,
    };
  }

  const language = existsSync("main.py") ? "python" : "javascript"; //"javascript" includes typescript.

  if (language === "python") {
    const pythonInstallResult = await installPythonDependencies();
    if (pythonInstallResult.status === "error") {
      return { status: "error", error: pythonInstallResult.error };
    }
  } else if (language === "javascript") {
    const javascriptInstallResult = await installJavascriptDependencies();
    if (javascriptInstallResult.status === "error") {
      return { status: "error", error: javascriptInstallResult.error };
    }
  }

  try {
    console.log(`Changing to entrypoint directory: ${baseDirectory}`);
    process.chdir(baseDirectory);
  } catch (e) {
    return {
      status: "error",
      error: `Error changing to directory: ${baseDirectory}.`,
    };
  }

  return {
    status: "success",
    result: { directory },
  };
}

export async function installDependencies(): Promise<
  DependenciesSuccessResult | ErrorResult
> {
  const firebaseDataResult = parseFirebaseJson();
  if (firebaseDataResult.status === "error") return firebaseDataResult;

  const directoriesResult = getFunctionDirectories(
    firebaseDataResult.result.data
  );
  if (directoriesResult.status === "error") return directoriesResult;

  const directories = directoriesResult.result.directories;

  const installedDirectories: string[] = [];

  // Iterating like this instead of using directories[0] allows for multiple codebases.
  for (const directory of directories) {
    const installResult = await installInDir(directory);
    if (installResult.status === "error") {
      return {
        status: "error",
        error: `Could not install dependencies in directory ${directory}: ${installResult.error}`,
      };
    }

    if (typeof installResult?.result?.directory === "string") {
      installedDirectories.push(installResult.result.directory);
    }
  }

  console.log("Successfully installed all dependencies.");

  return { status: "success", result: { directories: installedDirectories } };
}
