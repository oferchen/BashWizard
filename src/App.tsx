import "./react-bootstrap.css"
import "./App.css"
import "./index.css"
import "./parameter.css"
import "./menu.css"
import * as React from 'react';
import { BurgerMenu } from './menu';
import { MenuModel } from "./menuModel"
import svgFiles from "./images"
import { ParameterView } from './ParameterView';
import ParameterModel from './ParameterModel';
import { bashTemplates } from './bashTemplates';
import Splitter from 'm-react-splitters';
import trim from 'lodash-es/trim';
import trimEnd from 'lodash-es/trimEnd';
import trimStart from 'lodash-es/trimStart';
import { camelCase } from "lodash-es";
import { uniqueId } from 'lodash-es';
import { padEnd } from 'lodash-es'
import { Form, ControlLabel, FormControl, Checkbox } from "react-bootstrap"

interface IAppState {
    //
    //  these get replaced in this.stringify
    menuOpen: boolean;
    json: string;
    bash: string;
    endOfBash: string;
    input: string;
    menuItems: MenuModel[];
    SelectedParameter?: ParameterModel;


    //
    //  these get stringified
    //  these must match https://github.com/joelong01/Bash-Wizard/blob/master/bashGeneratorSharedModels/ConfigModel.cs
    ScriptName: string;
    Description: string;
    CreateLogFile: boolean;
    AcceptsInputFile: boolean;
    Parameters: ParameterModel[];


}


class App extends React.Component<{}, IAppState> {
    private myMenu = React.createRef<BurgerMenu>()
    private _settingState: boolean = false;
    private _loading: boolean = false;
    constructor(props: {}) {
        super(props);
        //#region menu creation
        const menu: MenuModel[] = []
        let menuItem: MenuModel = new MenuModel();
        menuItem.Icon = svgFiles.FileNew;
        menuItem.Text = "New Script";
        menuItem.onClicked = this.menuNewScript;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.isSeperator = true;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.FileOpen;
        menuItem.Text = "Open...";
        menuItem.onClicked = this.menuOpenScript;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.FileSaveAs;
        menuItem.Text = "Save As...";
        menuItem.onClicked = this.menuSaveAsBashWizardFile;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.FileSave;
        menuItem.Text = "Save";
        menuItem.onClicked = this.menuSaveBashWizardFile;
        menu.unshift(menuItem);
      
 
        menuItem = new MenuModel();
        menuItem.isSeperator = true;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.AddParameter;
        menuItem.Text = "Add Parameter";
        menuItem.onClicked = this.menuAddParameter;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.DeleteParameter;
        menuItem.Text = "Delete Parameter";
        menuItem.onClicked = this.menuDeleteParameter;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.isSeperator = true;
        menu.unshift(menuItem);

        
        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.Refresh;
        menuItem.Text = "Refresh";
        menuItem.onClicked = this.Refresh;
        menu.unshift(menuItem);

        menuItem = new MenuModel();
        menuItem.isSeperator = true;
        menu.unshift(menuItem);

 

        menuItem = new MenuModel();
        menuItem.Icon = svgFiles.DebugInfo;
        menuItem.Text = "VS Code Debug Settings";
        menuItem.onClicked = this.menuDebugInfo;
        menu.unshift(menuItem);
        //#endregion
        const params: ParameterModel[] = []

        this.state =
            {
                //
                //  these get replaced in this.stringify
                menuOpen: true,
                menuItems: menu,
                json: "",
                bash: "",
                input: "",
                endOfBash: bashTemplates.endOfBash,
                // these do not get replaced
                ScriptName: "",
                Description: "",
                CreateLogFile: false,
                AcceptsInputFile: false,
                Parameters: params,


            }

    }

    private getDebugInfo = (scriptDirectory: string): string => {
        let sb: string = "";
        try {

            let scriptName: string = this.state.ScriptName
            let slashes: string = "/\\"
            let quotes: string = "\"\'"
            let scriptDir: string = trimEnd(scriptDirectory, slashes)
            scriptDir = trimStart(scriptDir, "./")
            scriptName = trimStart(scriptName, slashes);
            const nl: string = "\n";
            sb = `{${nl}`
            sb += `${this.Tabs(1)}\"type\": \"bashdb\",${nl}`
            sb += `${this.Tabs(1)}\"request\": \"launch\",${nl}`
            sb += `${this.Tabs(1)}\"name\": \"Debug ${this.state.ScriptName}\",${nl}`
            sb += `${this.Tabs(1)}\"cwd\": \"\${workspaceFolder}\",${nl}`

            sb += `${this.Tabs(1)}\"program\": \"\${workspaceFolder}/${scriptDir}/${this.state.ScriptName}\",${nl}`
            sb += `${this.Tabs(1)}\"args\": [${nl}`
            for (let param of this.state.Parameters) {
                const p:string = trimEnd(trimStart(param.default, quotes), quotes);
                sb += `${this.Tabs(2)}\"--${param.longParameter}\",${nl}${this.Tabs(2)}\"${p}\",${nl}`
            }


            sb += `${this.Tabs(1)}]${nl}`
            sb += `}`
        }
        catch (e) {
            return `Exception generating config\n\nException Info:\n===============\n${e.message}`
        }

        return sb;

    }

    //#region menu handlers
    private menuDebugInfo = (): void => {        
        this.setState({bash: this.getDebugInfo("BashScripts")})
        this.myMenu.current!.isOpen = false;
    }
    private menuSaveAsBashWizardFile = (): void => {
        this.myMenu.current!.isOpen = false;

    }
    private Refresh = async (): Promise<void> => {
        await this.jsonToUi(this.state.json);
        this.myMenu.current!.isOpen = false;
    }
    private menuOpenScript = (): void => {

        this.myMenu.current!.isOpen = false;

    }
    private menuAddParameter = (): void => {
        this.addParameter(new ParameterModel(), true);
        this.myMenu.current!.isOpen = false;

    }
    private menuDeleteParameter = async (): Promise<void> => {
        this.myMenu.current!.isOpen = false;
        if (this.state.SelectedParameter !== undefined) {
            const toDelete: ParameterModel = this.state.SelectedParameter;
            this.state.SelectedParameter.selected = false;
            let index: number = this.state.Parameters.indexOf(this.state.SelectedParameter)
            if (index !== -1) {
                await this.deleteParameter(toDelete) // after this point the state has been changed
                //
                //  highlight the item previous to the deleted one, unless it was the first one
                const newLength = this.state.Parameters.length;
                if (newLength === 0) {
                    return;
                }
                if (index === newLength) {
                    index--;
                }

                //
                //  select the first one if the first one was deleted, otherwise select the previous one
                this.state.Parameters[index].selected = true;
            }
            else {
                console.log("index of selected item is -1!")
            }
        }

    }
    private menuNewScript = (): void => {
        this.myMenu.current!.isOpen = false;
        this.reset();

    }

    private reset = async (): Promise<void> => {
        await this.setStateAsync({
            ScriptName: "",
            EchoInput: false,
            CreateLogFile: false,
            TeeToLogFile: false,
            AcceptsInputFile: false,
            Parameters: [],
            SelectedParameter: undefined,
            json: "",
            bash: "",
            input: ""
        })
    }
    private menuSaveBashWizardFile = (): void => {
        this.myMenu.current!.isOpen = false;
    }
    //#endregion
    //
    // see https://github.com/react-bootstrap/react-bootstrap/issues/2781 on why
    // we need the untion of types for the event
    private changedScriptName = async (e: React.FocusEvent<FormControl & HTMLInputElement>) => {
        await this.setStateAsync({ ScriptName: e.currentTarget.value })
        await this.setStateAsync({ json: this.stringify(), bash: this.toBash(), input: this.toInput() })
        this.forceUpdate()
    }
    private changedDescription = async (e: React.FocusEvent<FormControl & HTMLInputElement>) => {
        await this.setStateAsync({ ScriptName: e.currentTarget.value })
        await this.setStateAsync({ json: this.stringify(), bash: this.toBash(), input: this.toInput() })
        this.forceUpdate()
    }
    private Tabs = (n: number): string => {
        let s: string = "";
        for (let i: number = 0; i < n; i++) {
            s += "    ";
        }
        return s;
    }

    private longestParameter = (): number => {
        return Math.max(...(this.state.Parameters.map(el => el.longParameter.length)))
    }

    private toBash = (): string => {

        try {
            let sbBashScript: string = bashTemplates.bashTemplate;
            let logTemplate: string = bashTemplates.logTemplate;
            let parseInputTemplate: string = bashTemplates.parseInputTemplate;
            let requiredVariablesTemplate: string = bashTemplates.requiredVariablesTemplate;

            let nl: string = "\n"
            let usageLine: string = `${this.Tabs(1)}echo \"Usage: $0 `
            let usageInfo: string = `${this.Tabs(1)}echo \"\"\n`
            let echoInput: string = `\"${this.state.ScriptName}:\"${nl}`
            let shortOptions: string = ""
            let longOptions: string = ""
            let inputCase: string = ""
            let inputDeclarations: string = ""
            let parseInputFile: string = ""
            let requiredFilesIf: string = ""
            const toPad: number = this.longestParameter() + 5;

            for (let param of this.state.Parameters) {
                //
                // usage
                let required: string = (param.requiredParameter) ? "Required      " : "Optional     ";
                usageLine += `${param.shortParameter} | --${param.longParameter}`
                usageInfo += `${this.Tabs(1)}echo \" -${param.shortParameter} | --${padEnd(param.longParameter, toPad, " ")} ${required} ${param.description}\"${nl}`

                //
                // the  echoInput function
                echoInput += `${this.Tabs(1)}echo \"${this.Tabs(1)}${padEnd(param.longParameter, toPad, ".")} \$${param.variableName}\"${nl}`


                //
                //  OPTIONS, LONGOPTS
                let colon: string = (param.requiresInputString) ? ":" : "";
                shortOptions += `${param.shortParameter}${colon}`
                longOptions += `${param.longParameter}${colon},`

                // input Case
                inputCase += `${this.Tabs(2)}-${param.shortParameter} | --${param.longParameter})\n`
                inputCase += `${this.Tabs(3)}${param.variableName}=${param.valueIfSet}\n`
                inputCase += param.requiresInputString ? `${this.Tabs(3)}shift 2\n` : `${this.Tabs(3)}shift 1\n`
                inputCase += `${this.Tabs(3)};;\n`

                // declare variables
                inputDeclarations += `declare ${param.variableName}=${param.default}\n`
                if (this.state.AcceptsInputFile && param.variableName !== "inputFile") {
                    // parse input file
                    parseInputFile += `${this.Tabs(1)}${param.variableName}=$(echo \"\${configSection}\" | jq \'.[\"${param.longParameter}\"]\' --raw-output)\n`
                }

                // if statement for the required files

                if (param.requiredParameter) {
                    requiredFilesIf += `[ -z \"\${${param.variableName}}\" ] || `
                }

            }
            //
            //  phase 2 - fix up any of the string created above         

            usageLine += "\""

            //  remove last line
            longOptions = longOptions.slice(0, -1);
            inputCase = inputCase.slice(0, -1)
            usageInfo = usageInfo.slice(0, -1)

            if (requiredFilesIf.length > 0) {
                requiredFilesIf = requiredFilesIf.slice(0, -4); // removes the " || " at the end
                requiredVariablesTemplate = requiredVariablesTemplate.replace("__REQUIRED_FILES_IF__", requiredFilesIf)
            }
            else {
                requiredVariablesTemplate = "";
            }

            if (this.state.CreateLogFile) {
                logTemplate = logTemplate.replace("__LOG_FILE_NAME__", this.state.ScriptName + ".log");
            }
            else {
                logTemplate = ""
            }

            //
            //  phase 3 - replace the strings in the templates
            sbBashScript = sbBashScript.replace("__USAGE_LINE__", usageLine);
            sbBashScript = sbBashScript.replace("__USAGE__", usageInfo);
            sbBashScript = sbBashScript.replace("__ECHO__", echoInput);
            sbBashScript = sbBashScript.replace("__SHORT_OPTIONS__", shortOptions);
            sbBashScript = sbBashScript.replace("__LONG_OPTIONS__", longOptions);
            sbBashScript = sbBashScript.replace("__INPUT_CASE__", inputCase);
            sbBashScript = sbBashScript.replace("__INPUT_DECLARATION__", inputDeclarations);

            let inputOverridesRequired: string = (this.state.AcceptsInputFile) ? "echoWarning \"Required parameters can be passed in the command line or in the input file.  The command line overrides the setting in the input file.\"" : "";
            sbBashScript = sbBashScript.replace("__USAGE_INPUT_STATEMENT__", inputOverridesRequired);

            if (parseInputFile.length > 0) {
                parseInputTemplate = parseInputTemplate.replace("__SCRIPT_NAME__", this.state.ScriptName);
                parseInputTemplate = parseInputTemplate.replace("__FILE_TO_SETTINGS__", parseInputFile);
                sbBashScript = sbBashScript.replace("__PARSE_INPUT_FILE", parseInputTemplate);
            }
            else {
                sbBashScript = sbBashScript.replace("__PARSE_INPUT_FILE", "");
            }

            sbBashScript = sbBashScript.replace("__BEGIN_TEE__", bashTemplates.beginTee);


            sbBashScript = sbBashScript.replace("__REQUIRED_PARAMETERS__", requiredVariablesTemplate);
            sbBashScript = sbBashScript.replace("__LOGGING_SUPPORT_", logTemplate);
            sbBashScript = sbBashScript.replace("__ECHO_INPUT__", "echoInput");
            return sbBashScript;
        }
        catch (e) {
            return `something went wrong.  ${e}`
        }

    }
    //
    //  this is an "opt in" replacer -- if you want something in the json you have to add it here
    private jsonReplacer = (name: string, value: any) => {

        if (name === "" || name === "ScriptName" || name === "EchoInput" || name === "CreateLogFile" || name === "TeeToLogFile" || name === "AcceptsInputFile" || name === "Parameters") {
            return value;
        }
        //
        //  JSON.strinfigy passes in indexes as strings for array elements                
        if (!isNaN(Number(name))) {
            return value;
        }

        return ParameterModel.jsonReplacer(name, value);

    }
    public stringify = () => {

        const jsonDoc = JSON.stringify(this.state, this.jsonReplacer, 4);
        return jsonDoc;
    }

    private toInput = () => {
        const nl: string = "\n";
        let sb: string = `${this.Tabs(1)}\"${this.state.ScriptName}\": { ${nl}`
        let paramKeyValuePairs: string = "";
        const quotes: string = '"'
        for (let param of this.state.Parameters) {
            let defValue: string = param.default;
            defValue = trim(defValue);
            defValue = trimEnd(defValue, quotes);
            defValue = defValue.replace("\\", "\\\\");
            paramKeyValuePairs += `${this.Tabs(2)}\"${param.longParameter}\": \"${defValue}\",${nl}`
        };
        //  delete trailing "," "\n" and spaces
        paramKeyValuePairs = trimEnd(paramKeyValuePairs, ',\n');


        sb += paramKeyValuePairs;
        sb += `${nl}${this.Tabs(1)}}`
        return sb
    }

    private deleteParameter = async (parameter: ParameterModel) => {
        if (parameter === undefined) {
            console.log("App.DeleteParameter: WARNING:  ATTEMPTING TO DELETE AN UNDEFINED PARAMETER")
            return;
        }
        let array: ParameterModel[] = [...this.state.Parameters]
        const index: number = array.indexOf(parameter)
        if (index === -1) {
            console.log("App.DeleteParameter: WARNING: PARAMETER NOT FOUND IN ARRAY TO DELETE")
            return;
        }

        array.splice(index, 1);
        await this.setStateAsync({ Parameters: array })

    }

    private deleteParameterByLongName = async (longName: string) => {
        let index: number = 0;
        for (index = 0; index < this.state.Parameters.length; index++) {
            if (this.state.Parameters[index].longParameter === longName) {
                await this.deleteParameter(this.state.Parameters[index]);
                return;
            }
        }
    }

    private parameterExists = (longName: string): boolean => {
        for (let parameter of this.state.Parameters) {
            if (parameter.longParameter === longName) {
                return true;
            }
        }
        return false;
    }
    private keyValueCount = (key: string, value: string): number => {
        let count: number = 0;
        for (let parameter of this.state.Parameters) {
            if (parameter[key] === value) {
                count++;
            }
        }
        return count;
    }


    private validateParameters = (): string => {
        for (let param of this.state.Parameters) {
            if (param.longParameter === "" && param.shortParameter === "" && param.selected) {
                // likely just starting...
                continue;
            }
            if (this.keyValueCount("longParameter", param.longParameter) !== 1) {
                return `you already have ${param.longParameter} as Long Parameter`
            }
            if (this.keyValueCount("shortParameter", param.shortParameter) !== 1) {
                return `you already have ${param.shortParameter} as Short Parameter`
            }
            if (this.keyValueCount("variableName", param.variableName) !== 1) {
                return `you already have ${param.shortParameter} as a Variable Name`
            }

            if (param.requiresInputString && param.valueIfSet !== "$2") {
                return `parameter ${param.longParameter} has Required Input String = true but hasn't set the Value if Set to $2.  this is an invalid combination`
            }
            if (!param.requiresInputString && param.valueIfSet === "$2") {
                return `parameter ${param.longParameter} has Required Input String = false but has set the Value if Set to $2.  this is an invalid combination`
            }
        }
        return "";
    }
    //
    //  this is called by the model
    public onPropertyChanged = async (parameter: ParameterModel, name: string) => {
        console.log(`App.onPropertyChanged: [_settingState: ${this._settingState}] [loading=${this._loading}] [name=${name}] [value=${parameter[name]}] [parameter=%o]`, parameter)
        if (this._loading === true) {
            return;
        }
        if (this._settingState === true) {
            return;
        }
        try {
            this._settingState = true;
            if (name === "selected") {
                if (this.state.SelectedParameter === parameter) {
                    return;
                }
                if (this.state.SelectedParameter !== undefined) {
                    this.state.SelectedParameter.selected = false; // old selected no longer selected
                }
                await this.setStateAsync({ SelectedParameter: parameter })
                return;
            }
            let validMessage: string = this.validateParameters()
            if (validMessage !== "") {
                this.setState({ bash: validMessage })
                return;
            }
            if (name === "longParameter") {
                //
                //  attempt to autofill short name and variable name
                //  
                if (parameter.shortParameter === "" || parameter.shortParameter === "Short Parameter") {

                    // tslint:disable-next-line:prefer-for-of
                    for (let i = 0; i < parameter.longParameter.length; i++) {
                        parameter.shortParameter = parameter.longParameter.substring(i, 1)
                        if (parameter.shortParameter === "") {
                            continue;
                        }
                        if (this.validateParameters() === "") {
                            break;
                        }
                    }

                }
                validMessage = this.validateParameters()
                if (validMessage !== "") {
                    parameter.shortParameter = ""
                    this.setState({ bash: validMessage + "\npick a short name that works..." })
                    return;
                }
                if (parameter.variableName === "" || parameter.variableName === "Variable Name") {
                    parameter.variableName = camelCase(parameter.longParameter);
                }

                validMessage = this.validateParameters()
                if (validMessage !== "") {
                    this.setState({ bash: validMessage })
                }

            }
            this.setState({ json: this.stringify(), bash: this.toBash(), input: this.toInput() })


        }
        finally {
            this._settingState = false
        }

    }


    private addParameter = async (model: ParameterModel, select: boolean) => {

        model.uniqueName = uniqueId("PARAMETER_DIV_")
        model.registerNotify(this.onPropertyChanged)
        model.selected = select;

        const list: ParameterModel[] = this.state.Parameters.concat(model);
        await this.setStateAsync({ Parameters: list })
        await this.setStateAsync({ json: this.stringify(), bash: this.toBash(), input: this.toInput() })

        // const validMessage: string = this.validateParameters()
        // if (validMessage !== "") {
        //     this.setState({ bash: validMessage })
        // }
        // else {
        //     await this.setStateAsync({ json: this.stringify(), bash: this.toBash(), input: this.toInput() })
        // }

    }

    //
    //  see https://github.com/react-bootstrap/react-bootstrap/issues/2781 for why we have to have
    //  the union in the type
    private onChecked = async (e: React.ChangeEvent<FormControl & HTMLInputElement>) => {

        const key = e.currentTarget.id as string
        let val = e.currentTarget.checked as boolean
        if (val === undefined) {
            val = false;
        }

        switch (key) {
            case "AcceptsInputFile":
                {
                    await this.setStateAsync({ AcceptsInputFile: val })
                    if (val === true) {
                        let p: ParameterModel = new ParameterModel()
                        p.default = "";
                        p.description = "the name of the input file. pay attention to $PWD when setting this"
                        p.longParameter = "input-file"
                        p.shortParameter = "i"
                        p.requiresInputString = true;
                        p.requiredParameter = false;
                        p.valueIfSet = "$2"
                        p.variableName = "inputFile"
                        await this.addParameter(p, true);
                    }
                    else {
                        await this.deleteParameterByLongName("input-file")
                    }
                }
                break;
            case "EchoInput":
                await this.setStateAsync({ EchoInput: val });
                break;
            case "CreateLogFile":
                {
                    await this.setStateAsync({ CreateLogFile: val }); // update the state of the checkbox
                    if (val === true) { // adding it
                        if (!this.parameterExists("log-directory")) {
                            let p: ParameterModel = new ParameterModel()
                            p.longParameter = "log-directory",
                                p.shortParameter = "l",
                                p.description = "directory for the log file.  the log file name will be based on the script name",
                                p.variableName = "logDirectory",
                                p.default = "\"./\"",
                                p.requiresInputString = true,
                                p.requiredParameter = false,
                                p.valueIfSet = "$2"
                            await this.addParameter(p, true);
                        }
                    } else { // removing it
                        await this.deleteParameterByLongName("log-directory")
                    }
                }
                break;
            case "TeeToLogFile":
                await this.setStateAsync({ TeeToLogFile: val });
                break;
            default:
                break;
        }
    }


    private setStateAsync = (newState: object): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.setState(newState, () => {
                resolve();
            });
        });
    }


    private renderOneParameter = (parameter: ParameterModel): JSX.Element => {

        // this took *hours* to track down.  do not *ever* use the index as the key
        // react will use the key to render.  say you have 3 items -- with key=0, 1, 2
        // you delete the key=1 leaving 0 and 2.  but then you run render() again and you 
        // get key 0 and 1 again ...and the item you just deleted is still referenced as item 1
        // and it'll look like you deleted the wrong item.         
        //
        //  AND!!!
        //
        //
        //  another n hours of my life I won't get back:  if you always create a uniqueId, then
        //  whenever you change state, you'll get a new object.  this manifests itself by the
        //  the form looking like TAB doesn't work.  or onBlur() doesn't work.  you type a character
        //  (which causes the <App/> to update state) and the form stops taking input
        //
        //  the solution is to store the unique name and generate one when you create a new ParameterModel
        //  
        //  leasson:  the name is really a name.  treat it like one.
        //

        return (

            <div className={parameter.uniqueName} key={parameter.uniqueName} ref={parameter.uniqueName}>
                <ParameterView Model={parameter} Name={parameter.uniqueName} />
            </div>


        );
    }

    public renderParameters = () => {

        let parameterList: JSX.Element[] = []
        for (let p of this.state.Parameters) {
            parameterList.push(this.renderOneParameter(p))
        }
        return parameterList;

    }

    public render = () => {
        /*jsx requires one parent element*/
        console.log("App.render.  State: %o", this.state)
        return (
            <div className="outer-container" id="outer-container">
                <BurgerMenu ref={this.myMenu} isOpen={this.state.menuOpen} Items={this.state.menuItems} />
                <div id="DIV_LayoutRoot" className="DIV_LayoutRoot">
                    <Splitter className="SPLITTER-TopBottom"
                        position="horizontal"
                        primaryPaneMaxHeight="100%"
                        primaryPaneMinHeight="10%"
                        primaryPaneHeight="400px"
                        dispatchResize={true}
                        postPoned={false}>
                        <div className="DIV_Top">
                            <Form className="Global_Input_Form" horizontal={true}>
                                <ControlLabel className="LABEL_ScriptName">Script Name</ControlLabel>
                                <FormControl id="scriptName" width={"100px"} className="INPUT_scriptName" spellCheck={false} type="text" value={this.state.ScriptName} onBlur={this.changedScriptName}
                                    onChange={(e: React.ChangeEvent<FormControl & HTMLInputElement>) => this.setState({ ScriptName: e.currentTarget.value })} />
                                <ControlLabel className="LABEL_Description">Description</ControlLabel>
                                <FormControl id="description" width={"100px"} className="INPUT_description" spellCheck={false} type="text" value={this.state.Description} onBlur={this.changedDescription}
                                    onChange={(e: React.ChangeEvent<FormControl & HTMLInputElement>) => this.setState({ Description: e.currentTarget.value })} />
                                <Checkbox id="CreateLogFile" className="INPUT_CreateLogFile" type="checkbox" checked={this.state.CreateLogFile} onChange={this.onChecked}>Create Log File</Checkbox>
                                <Checkbox id="AcceptsInputFile" className="INPUT_AcceptsInputFile" type="checkbox" checked={this.state.AcceptsInputFile} onChange={this.onChecked}>Accepts Input File</Checkbox>

                            </Form>
                            <div className="Parameter_List">
                                {this.renderParameters()}
                            </div>
                        </div>
                        <div className="DIV_Bottom">
                            <Splitter className="SPLITTER_BottomLeftRight" position="vertical"
                                primaryPaneMaxWidth="95%"
                                primaryPaneMinWidth="5%"
                                primaryPaneWidth="50%"
                                postPoned={false}>

                                <div className="DIV_BottomLeft">
                                    <textarea className="TEXTAREA_Bash" id="bashDoc" value={this.state.bash} spellCheck={false} readOnly={true} onFocus={(e) => { e.currentTarget.select(); }}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => this.setState({ json: e.currentTarget.value })}
                                    />
                                    <textarea className="TEXTAREA_EndOfBash" id="TEXTAREA_EndOfBash" spellCheck={false} defaultValue={this.state.endOfBash} readOnly={true} onFocus={(e) => { e.currentTarget.select(); }} />
                                </div>
                                <div className="DIV_BottomRight">
                                    <Splitter className="SPLITTER_JsonInput" position="horizontal"
                                        postPoned={false}
                                        primaryPaneHeight="80%"
                                        primaryPaneMinHeight="10%"
                                        primaryPaneMaxHeight="95%"
                                    >
                                        <textarea className="TEXTAREA_jsonDoc" id="jsonDoc" value={this.state.json} spellCheck={false} readOnly={false}
                                            onFocus={(e) => { e.currentTarget.select(); }} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => this.setState({ json: e.currentTarget.value })} />
                                        <textarea className="TEXTAREA_settings" id="input_settings" defaultValue={this.state.input} spellCheck={false} readOnly={true} onFocus={(e) => { e.currentTarget.select(); }} />
                                    </Splitter>

                                </div>
                            </Splitter>
                        </div>
                    </Splitter>
                </div>
            </div>
        );
    }

    private async jsonToUi(json: string): Promise<void> {
        try {
            //
            //  do it in this order in case the json parse throws, we don't wipe any UI
            const objs = JSON.parse(json);
            await this.reset()
            this._loading = false;
            this.setState({
                ScriptName: objs.ScriptName,
                CreateLogFile: objs.CreateLogFile,
                AcceptsInputFile: objs.AcceptsInputFile,
            });
            //
            //  these unserialized things are only partially ParameterModels -- create the real ones

            for (let p of objs.Parameters) {
                let model: ParameterModel = new ParameterModel();
                model.default = p.Default;
                model.description = p.Description;
                model.longParameter = p.LongParameter;
                model.valueIfSet = p.ValueIfSet;
                model.oldValueIfSet = "";
                model.selected = false;
                model.requiredParameter = p.RequiredParameter;
                model.shortParameter = p.ShortParameter;
                model.variableName = p.VariableName;
                model.requiresInputString = p.RequiresInputString;
                this.addParameter(model, false)
            }

            this.state.Parameters.map(el => el.selected = false)
            this._loading = false;
            this.state.Parameters[0].selected = true;
        }
        catch (e) {
            this.setState({ bash: "Error parsing JSON" + e.message });
        }
        finally {
            this.myMenu.current!.isOpen = false;
            console.log("after jsontoUi: %o", this.state.Parameters)
            this._loading = false;
        }

    }
}

export default App;
