// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as child_process from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as Q from "q";

import {CordovaProjectHelper} from "../src/utils/cordovaProjectHelper";

export function executeCordovaCommand(cwd: string, command: string): Q.Promise<any> {
    let deferred = Q.defer<any>();
    let cordovaCmd = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    let commandToExecute = cordovaCmd + " " + command;
    let process = child_process.exec(commandToExecute, { cwd: cwd });

    let stderr = "";
    process.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
    });

    process.stdout.on("data", (data: Buffer) => {
        console.log(data.toString());
    });

    process.on("error", function (err: any): void {
        deferred.reject(err);
    });

    process.on("close" , exitCode => {
        if (exitCode !== 0) {
            return deferred.reject(`Cordova command failed with exit code ${exitCode}. Error: ${stderr}`);
        }
        deferred.resolve({});
    });

    return deferred.promise;
}

export function createCordovaProject(cwd: string, projectName: string): Q.Promise<any> {
    let cordovaCommandToRun = "create " + projectName;
    return executeCordovaCommand(cwd, cordovaCommandToRun);
}

export function addCordovaComponents(componentName: string, projectRoot: string, componentsToAdd: string[]): Q.Promise<any> {
    let cordovaCommandToRun = componentName + " add " + componentsToAdd.join(" ");
    return executeCordovaCommand(projectRoot, cordovaCommandToRun);
}

export function removeCordovaComponents(componentName: string, projectRoot: string, componentsToRemove: string[]): Q.Promise<any> {
    let cordovaCommandToRun = componentName + " remove " + componentsToRemove.join(" ");
    return executeCordovaCommand(projectRoot, cordovaCommandToRun);
}

export function enumerateListOfTypeDefinitions(projectRoot: string): string[] {
    let typeDefsFolder = CordovaProjectHelper.getCordovaPluginTypeDefsPath(projectRoot);

    // look for all the type defs in the typings folder
    if (!CordovaProjectHelper.existsSync(typeDefsFolder)) {
        return [];
    } else {
        return fs.readdirSync(typeDefsFolder);
    }
}

export function isUrlReachable(url: string): Q.Promise<boolean> {
    let deferred = Q.defer<boolean>();

    http.get(url, (res) => {
        deferred.resolve(true);
        res.resume();
    }).on("error", (_err: Error) => {
        deferred.resolve(false);
    });

    return deferred.promise;
}

export function convertWindowsPathToUnixOne(path: string) {
    return path.replace(/\\/g, "/");
}
