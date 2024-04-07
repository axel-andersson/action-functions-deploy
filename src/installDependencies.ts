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
import { existsSync } from "fs";
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
    var firebaseData = JSON.parse(readFileSync("firebase.json", "utf8"));
    return { status: "success", result: { data: firebaseData } };
  } catch (e) {
    console.log(e);
    return { status: "error", error: "Could not parse firebase.json" };
  }
}

function getFunctionDirectories(
  firebaseData: any
): FunctionDirectoriesResult | ErrorResult {
  try {
    console.log("Getting function directory (directories)");
    const directories = firebaseData.map((item: any) => item.source);

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

  const installOutputBuffer: Buffer[] = [];
  const installErrorBuffer: Buffer[] = [];

  try {
    console.log(`Installing npm dependencies.`);

    await exec("npm install", [], {
      listeners: {
        stdout: (data: Buffer) => {
          installOutputBuffer.push(data);
        },
        stderr: (data: Buffer) => {
          installErrorBuffer.push(data);
        },
      },
    });
  } catch (e) {
    console.log(Buffer.concat(installOutputBuffer).toString("utf-8"));
    console.log(e.message);
    return {
      status: "error",
      error: `Error when installing npm dependencies: ${e}`,
    };
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

  for (const directory of directories) {
    const installResult = await installInDir(directory);
    if (installResult.status === "error") {
      return {
        status: "error",
        error: `Could not install dependencies in directory ${directory}: ${installResult.error}`,
      };
    }
  }

  console.log("Successfully installed npm dependencies.")

  return { status: "success", result: { directories } };
}

function readFileSync(arg0: string, arg1: string): string {
  throw new Error("Function not implemented.");
}
