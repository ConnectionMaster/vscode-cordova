// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as Q from "q";
import { PluginSimulator } from "./simulate";
import { SimulationInfo } from "../common/simulationInfo";
import { SimulateOptions } from "cordova-simulate";
import * as vscode from "vscode";
import { IProjectType } from "../utils/cordovaProjectHelper";
import { Telemetry } from "../utils/telemetry";
import { CordovaCommandHelper } from "../utils/cordovaCommandHelper";
import { ProjectsStorage } from "./projectsStorage";
import * as nls from "vscode-nls";
import { createAdditionalWorkspaceFolder, onFolderAdded } from "../cordova";
nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize = nls.loadMessageBundle();

export class CordovaWorkspaceManager implements vscode.Disposable {
    public pluginSimulator: PluginSimulator;
    public workspaceRoot: vscode.WorkspaceFolder;

    public constructor(pluginSimulator: PluginSimulator, workspaceRoot: vscode.WorkspaceFolder) {
        this.workspaceRoot = workspaceRoot;
        this.pluginSimulator = pluginSimulator;
    }

    public static getWorkspaceManagerByProjectRootPath(projectRootPath: string): CordovaWorkspaceManager {
        let workspaceManager = ProjectsStorage.projectsCache[projectRootPath.toLowerCase()];
        if (!workspaceManager) {
            const workspaceFolder = createAdditionalWorkspaceFolder(projectRootPath);
            if (workspaceFolder) {
                onFolderAdded(workspaceFolder);
                workspaceManager = ProjectsStorage.projectsCache[workspaceFolder.uri.fsPath.toLowerCase()];
            }
            if (!workspaceManager) {
                throw new Error(localize("CouldntFindWorkspaceManager", "Could not find workspace manager by the project root path {0}", projectRootPath));
            }
        }
        return workspaceManager;
    }

    /**
     * Stops the server.
     */
    public dispose(): void {
        if (this.pluginSimulator) {
            this.pluginSimulator.dispose();
            this.pluginSimulator = null;
        }
    }

    /**
     * Sends telemetry
     */
    public sendTelemetry(extensionId: string, extensionVersion: string, appInsightsKey: string, eventName: string, properties: { [key: string]: string }, measures: { [key: string]: number }): Q.Promise<any> {
        Telemetry.sendExtensionTelemetry(extensionId, extensionVersion, appInsightsKey, eventName, properties, measures);
        return Q.resolve({});
    }

    /**
     * Prepares for simulate debugging. The server and simulate host are launched here.
     * The application host is launched by the debugger.
     *
     * Returns info about the running simulate server
     */
    public simulate(fsPath: string, simulateOptions: SimulateOptions, projectType: IProjectType): Q.Promise<SimulationInfo> {
        return this.launchSimulateServer(fsPath, simulateOptions, projectType)
            .then((simulateInfo: SimulationInfo) => {
                return this.launchSimHost(simulateOptions.target).then(() => simulateInfo);
            });
    }

    /**
     * Launches the simulate server. Only the server is launched here.
     *
     * Returns info about the running simulate server
     */
    public launchSimulateServer(fsPath: string, simulateOptions: SimulateOptions, projectType: IProjectType): Q.Promise<SimulationInfo> {
        return this.pluginSimulator.launchServer(fsPath, simulateOptions, projectType);
    }

    /**
     * Launches sim-host using an already running simulate server.
     */
    public launchSimHost(target: string): Q.Promise<void> {
        return this.pluginSimulator.launchSimHost(target);
    }

    /**
     * Returns the number of currently visible editors.
     */
    public getVisibleEditorsCount(): Q.Promise<number> {
        // visibleTextEditors is null proof (returns empty array if no editors visible)
        return Q.resolve(vscode.window.visibleTextEditors.length);
    }

    public getRunArguments(fsPath: string): Q.Promise<string[]> {
        return Q.resolve(CordovaCommandHelper.getRunArguments(fsPath));
    }


    public getCordovaExecutable(fsPath: string): Q.Promise<string> {
        return Q.resolve(CordovaCommandHelper.getCordovaExecutable(fsPath));
    }
}
