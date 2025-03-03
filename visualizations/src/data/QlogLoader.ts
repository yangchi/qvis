import QlogConnectionGroup from '@/data/ConnectionGroup';


import * as qlog01 from '@quictools/qlog-schema';
import * as qlogPreSpec from '@quictools/qlog-schema/draft-16/QLog';
import { QUtil } from '@quictools/qlog-schema/util';
import QlogConnection from '@/data/Connection';
import { IQlogEventParser, IQlogRawEvent } from '@/data/QlogEventParser';


export class QlogLoader {

    public static fromJSON(json:any) : QlogConnectionGroup | undefined {

        if ( json && json.qlog_version ){
            const version = json.qlog_version;
            if ( version === "0.1" ){
                return QlogLoader.fromPreSpec(json);
            }
            else if ( version === "draft-00" ){
                return QlogLoader.fromDraft00(json);
            }
            else if ( version === "draft-01" ){
                return QlogLoader.fromDraft01(json);
            }
            else {
                console.error("QlogLoader: Unknown qlog version! Only draft-00 and draft-01 are supported!", version, json);
                
                return undefined;
            }
        }
        else {
            console.error("QlogLoader: qlog files MUST have a qlog_version field in their top-level object!", json);

            return undefined;
        }

    }

    protected static fromDraft01(json:any) : QlogConnectionGroup {

        const fileContents:qlog01.IQLog = json as qlog01.IQLog;

        console.log("QlogLoader:fromDraft01 : ", fileContents, fileContents.traces);

        const group = new QlogConnectionGroup();
        group.version = fileContents.qlog_version;
        group.title = fileContents.title || "";
        group.description = fileContents.description || "";

        for ( let jsonconnection of fileContents.traces ){

            // a single trace can contain multiple component "traces" if group_id is used and we need to split them out first
            const qlogconnections:Array<QlogConnection> = new Array<QlogConnection>();

            if ( (jsonconnection as qlog01.ITraceError).error_description !== undefined ) {
                jsonconnection = jsonconnection as qlog01.ITraceError;

                const conn = new QlogConnection(group);
                conn.title = "ERROR";
                conn.description = jsonconnection.uri + " : " + jsonconnection.error_description;
                continue;
            }

            jsonconnection = jsonconnection as qlog01.ITrace;

            const groupIDIndex:number = jsonconnection.event_fields.indexOf("group_id");
            if ( jsonconnection.event_fields && groupIDIndex >= 0 ) {
                const groupLUT:Map<string, QlogConnection> = new Map<string, QlogConnection>();

                for ( const event of jsonconnection.events ) {

                    let groupID = event[ groupIDIndex ];
                    if ( typeof groupID !== "string" ) {
                        groupID = JSON.stringify(groupID);
                    }

                    let conn = groupLUT.get(groupID as string);
                    if ( !conn ){
                        conn = new QlogConnection(group);
                        conn.title = "Group " + groupID + " : ";
                        groupLUT.set( groupID as string, conn );

                        qlogconnections.push( conn );
                    }

                    conn.getEvents().push( event );
                }
            }
            else {
                // just one component trace, easy mode
                const conn = new QlogConnection(group);
                qlogconnections.push( conn );
                conn.setEvents( jsonconnection.events as any );
            }

            // component traces share most properties of the overlapping parent trace (e.g., vantage point etc.)
            for ( const connection of qlogconnections ){

                connection.title += jsonconnection.title ? jsonconnection.title : "";
                connection.description += jsonconnection.description ? jsonconnection.description : "";
                
                connection.vantagePoint = jsonconnection.vantage_point || {} as qlog01.IVantagePoint;

                if ( !connection.vantagePoint.type ){
                    connection.vantagePoint.type = qlog01.VantagePointType.unknown;
                    connection.vantagePoint.flow = qlog01.VantagePointType.unknown;
                    connection.vantagePoint.name = "No VantagePoint set";
                }

                connection.eventFieldNames = jsonconnection.event_fields;
                connection.commonFields = jsonconnection.common_fields!;
                connection.configuration = jsonconnection.configuration || {};

                connection.setEventParser( new EventFieldsParser() );

                for ( const evt of connection.getEvents() ){
                    const data = connection.parseEvent(evt).data;
                    
                    if ( data && data.type ){
                        data.packet_type = data.type.toLowerCase(); // older version of draft-01 had .type instead of .packet_type // FIXME: remove!
                    }
                    else if ( data && data.packet_type ){
                        data.type = data.packet_type.toLowerCase(); // older version of draft-01 had .type instead of .packet_type // FIXME: remove!
                    }
                }
            }
        }

        return group;
    }

    protected static fromDraft00(json:any) : QlogConnectionGroup {

        const fileContents:any = json; // we don't have TypeScript schema definitions for qlog00

        console.log("QlogLoader:fromDraft00 : ", fileContents, fileContents.traces);

        // TODO: rename QlogConnectionGroup because it's confusing with the group_id (they are NOT the same concepts!)
        const group = new QlogConnectionGroup();
        group.version = fileContents.qlog_version;
        group.title = fileContents.title || "";
        group.description = fileContents.description || "";

        for ( const jsonconnection of fileContents.traces ){

            // a single trace can contain multiple component "traces" if group_id is used and we need to split them out first
            const qlogconnections:Array<QlogConnection> = new Array<QlogConnection>();

            const groupIDIndex:number = jsonconnection.event_fields.indexOf("group_id");
            if ( jsonconnection.event_fields && groupIDIndex >= 0 ) {
                const groupLUT:Map<string, QlogConnection> = new Map<string, QlogConnection>();

                for ( const event of jsonconnection.events ) {
                    let groupID = event[ groupIDIndex ];
                    if ( typeof groupID !== "string" ) {
                        groupID = JSON.stringify(groupID);
                    }

                    let conn = groupLUT.get(groupID);
                    if ( !conn ){
                        conn = new QlogConnection(group);
                        conn.title = "Group " + groupID + " : ";
                        groupLUT.set( groupID, conn );

                        qlogconnections.push( conn );
                    }

                    conn.getEvents().push( event );
                }
            }
            else {
                // just one component trace, easy mode
                const conn = new QlogConnection(group);
                qlogconnections.push( conn );
                conn.setEvents( jsonconnection.events as any );
            }

            // component traces share most properties of the overlapping parent trace (e.g., vantage point etc.)
            for ( const connection of qlogconnections ){

                connection.title += jsonconnection.title ? jsonconnection.title : "";
                connection.description += jsonconnection.description ? jsonconnection.description : "";

                connection.vantagePoint = {} as qlog01.IVantagePoint;
                if ( jsonconnection.vantage_point ){
                    connection.vantagePoint.name = jsonconnection.vantage_point.name || "";

                    if ( jsonconnection.vantage_point.type === "SERVER" ){
                        connection.vantagePoint.type = qlog01.VantagePointType.server;
                    }
                    else if ( jsonconnection.vantage_point.type === "CLIENT" ){
                        connection.vantagePoint.type = qlog01.VantagePointType.client;
                    }
                    else if ( jsonconnection.vantage_point.type === "NETWORK" ){
                        connection.vantagePoint.type = qlog01.VantagePointType.network;
                        connection.vantagePoint.flow = qlog01.VantagePointType.client;
                    }
                }

                if ( !connection.vantagePoint.type ){
                    connection.vantagePoint.type = qlog01.VantagePointType.unknown;
                    connection.vantagePoint.flow = qlog01.VantagePointType.unknown;
                    connection.vantagePoint.name = "No VantagePoint set";
                }

                connection.eventFieldNames = jsonconnection.event_fields;
                connection.commonFields = jsonconnection.common_fields;
                connection.configuration = jsonconnection.configuration || {};

                connection.setEventParser( new EventFieldsParser() );

                for ( const evt of connection.getEvents() ){
                    const data = connection.parseEvent(evt).data;
                    if ( data.frames ) {
                        for ( const frame of data.frames ){
                            if ( frame.frame_type ){
                                frame.frame_type = frame.frame_type.toLowerCase();
                            }
                        }
                    }
                    
                    if ( data.packet_type ){
                        data.packet_type = data.packet_type.toLowerCase();
                        data.type = data.packet_type; // older version of draft-01 had .type instead of .packet_type // FIXME: remove!
                    }
                }
            }
        }

        return group;
    }

    protected static fromPreSpec(json:any) : QlogConnectionGroup {

        const fileContents:qlogPreSpec.IQLog = json as qlogPreSpec.IQLog;

        console.log("QlogLoader:fromPreSpec : ", fileContents, fileContents.connections);

        // QLog00 toplevel structure contains a list of connections
        // most files currently just contain a single connection, but the idea is to allow bundling connections on a single file
        // for example 1 log for the server and 1 for the client and 1 for the network, all contained in 1 file
        // This is why we call it a ConnectionGroup here, instead of QlogFile or something
        const group = new QlogConnectionGroup();
        group.version = fileContents.qlog_version;
        group.description = fileContents.description || "";

        for ( const jsonconnection of fileContents.connections ){

            const connection = new QlogConnection(group);

            // metadata can be just a string, so use that
            // OR it can be a full object, in which case we want just the description here
            let description = "no description";
            if ( jsonconnection.metadata ){
                if ( typeof jsonconnection.metadata === "string" ){
                    description = jsonconnection.metadata;
                }
                else if ( jsonconnection.metadata.description ){ // can be empty object {}
                    description = jsonconnection.metadata.description;
                }
            }

            if ( jsonconnection.vantagepoint ){
                connection.vantagePoint = {} as qlog01.IVantagePoint;
                if ( jsonconnection.vantagepoint === "SERVER" ){
                    connection.vantagePoint.type = qlog01.VantagePointType.server;
                }
                else if ( jsonconnection.vantagepoint === "CLIENT" ){
                    connection.vantagePoint.type = qlog01.VantagePointType.client;
                }
                else if ( jsonconnection.vantagepoint === "NETWORK" ){
                    connection.vantagePoint.type = qlog01.VantagePointType.network;
                    connection.vantagePoint.flow = qlog01.VantagePointType.client;
                }
            }

            connection.title = description;
            connection.description = description;

            connection.eventFieldNames = jsonconnection.fields;
            connection.setEvents( jsonconnection.events as any );

            connection.setEventParser( new PreSpecEventParser() );
        }

        return group;
    }
}

enum TimeTrackingMethod {
    RAW,
    REFERENCE_TIME,
    DELTA_TIME,
}


// tslint:disable max-classes-per-file
export class EventFieldsParser implements IQlogEventParser {

    private timeTrackingMethod = TimeTrackingMethod.RAW;
    private startTime:number = 0;
    private subtractTime:number = 0;
    private timeMultiplier:number = 1;
    private _timeOffset:number = 0;

    private timeIndex:number = 0;
    private categoryIndex:number = 1;
    private nameIndex:number = 2;
    private triggerIndex:number = 3;
    private dataIndex:number = 4;

    private categoryCommon:string = "unknown";
    private nameCommon:string = "unknown";
    private triggerCommon:string = "unknown";


    private currentEvent:IQlogRawEvent|undefined;

    public get time():number {
        if ( this.timeIndex === -1 ) {
            return 0;
        }

        // TODO: now we do this calculation whenever we access the .time property
        // probably faster to do this in a loop for each event in init(), but this doesn't fit well with the streaming use case...
        // can probably do the parseFloat up-front though?
        // return parseFloat((this.currentEvent as IQlogRawEvent)[this.timeIndex]) * this.timeMultiplier - this.subtractTime + this._timeOffset;
        return this.timeWithCustomOffset( this._timeOffset );
    }


    public timeWithCustomOffset( offsetInMs:number ){
        return parseFloat((this.currentEvent as IQlogRawEvent)[this.timeIndex]) * this.timeMultiplier - this.subtractTime + offsetInMs;
    }

    public get timeOffset():number {
        return this._timeOffset;
    }
    public get category():string {
        if ( this.categoryIndex === -1 ) {
            return this.categoryCommon;
        }

        return (this.currentEvent as IQlogRawEvent)[this.categoryIndex].toLowerCase();
    }
    public get name():string {
        if ( this.nameIndex === -1 ) {
            return this.nameCommon;
        }

        return (this.currentEvent as IQlogRawEvent)[this.nameIndex].toLowerCase();
    }
    public set name(val:string) {
        if ( this.nameIndex === -1 ) {
            return;
        }

        (this.currentEvent as IQlogRawEvent)[this.nameIndex] = val;
    }
    public get trigger():string {
        if ( this.triggerIndex === -1 ) {
            return this.triggerCommon;
        }

        return (this.currentEvent as IQlogRawEvent)[this.triggerIndex].toLowerCase();
    }
    public get data():any|undefined {
        if ( this.dataIndex === -1 ) {
            return {};
        }

        return (this.currentEvent as IQlogRawEvent)[this.dataIndex];
    }

    public timeToMilliseconds(time: number | string): number {
        return parseFloat(time as any) * this.timeMultiplier;
    }

    public init( trace:QlogConnection ) {
        this.currentEvent = undefined;

        if (trace.commonFields ){
            if ( trace.commonFields.category || trace.commonFields.CATEGORY ) {
                this.categoryCommon = trace.commonFields.category || trace.commonFields.CATEGORY;
                this.categoryCommon = this.categoryCommon.toLowerCase();
            }
            if ( trace.commonFields.event || trace.commonFields.EVENT_TYPE ) {
                this.nameCommon = trace.commonFields.event || trace.commonFields.EVENT_TYPE;
                this.nameCommon = this.nameCommon.toLowerCase();
            }
            if ( trace.commonFields.trigger || trace.commonFields.TRIGGER ) {
                this.triggerCommon = trace.commonFields.trigger || trace.commonFields.TRIGGER;
                this.triggerCommon = this.triggerCommon.toLowerCase();
            }
        }

        // events are a flat array of values
        // the "column names" are in a separate list: eventFieldNames
        // to know which index of the flat array maps to which type of value, we need to match indices to field types first
        let eventFieldNames = trace.eventFieldNames.slice(); // copy because to tolowercase
        eventFieldNames = eventFieldNames.map( (val) => val.toLowerCase() ); // 00 is uppercase, 01 lowercase

        this.categoryIndex  = eventFieldNames.indexOf( "category" ); // FIXME: get this string from the qlog definitions somewhere
        this.nameIndex      = eventFieldNames.indexOf( "event_type" );
        if ( this.nameIndex === -1 ) {
            this.nameIndex      = eventFieldNames.indexOf( "event" ); // 00 is event_type, 01 is event
        }
        this.triggerIndex   = eventFieldNames.indexOf( "trigger" );
        this.dataIndex      = eventFieldNames.indexOf( "data" );



        this.timeIndex = eventFieldNames.indexOf("time"); // typically 0
        if ( this.timeIndex === -1 ){
            this.timeIndex = eventFieldNames.indexOf("relative_time"); // typically 0

            if ( this.timeIndex === -1 ){
                this.timeTrackingMethod = TimeTrackingMethod.DELTA_TIME;

                console.error("QlogLoader: No proper timestamp present in qlog file. This tool doesn't support delta_time yet!", trace.eventFieldNames);
            }
            else {
                this.timeTrackingMethod = TimeTrackingMethod.REFERENCE_TIME;

                if ( trace.commonFields && trace.commonFields.reference_time !== undefined ){
                    this.startTime = parseFloat(trace.commonFields.reference_time);
                }
                else {
                    console.error("QlogLoader: Using relative_time but no reference_time found in common_fields", trace.eventFieldNames, trace.commonFields);
                    this.startTime = 0;
                }
            }
        }
        else{
            this.timeTrackingMethod = TimeTrackingMethod.RAW;
            this.startTime = parseFloat( trace.getEvents()[0][this.timeIndex] );
            this.subtractTime = this.startTime;
        }

        if ( trace.configuration && trace.configuration.time_units && trace.configuration.time_units === "us" ){
            this.timeMultiplier = 0.001; // timestamps are in microseconds, we want to view everything in milliseconds
        }

        if ( trace.configuration && trace.configuration.time_offset ){
            this._timeOffset = parseFloat( trace.configuration.time_offset ) * this.timeMultiplier;
        }

        this.startTime *= this.timeMultiplier;
    }

    public load( evt:IQlogRawEvent ) : IQlogEventParser {
        this.currentEvent = evt;

        return this;
    }
}

// tslint:disable max-classes-per-file
export class PreSpecEventParser implements IQlogEventParser {

    private currentEvent:IQlogRawEvent|undefined;

    public get time():number {
        return this.timeWithCustomOffset(0);
    }
    
    public timeWithCustomOffset( offsetInMs:number ):number {
        return parseFloat( (this.currentEvent as IQlogRawEvent)[0] ) + offsetInMs;
    }

    public get category():string {
        return (this.currentEvent as IQlogRawEvent)[1];
    }
    public get name():string {
        return (this.currentEvent as IQlogRawEvent)[2];
    }
    public set name(val:string) {
        (this.currentEvent as IQlogRawEvent)[2] = val;
    }
    public get trigger():string {
        return (this.currentEvent as IQlogRawEvent)[3];
    }
    public get data():any|undefined {
        return (this.currentEvent as IQlogRawEvent)[4];
    }

    public get timeOffset():number {
        return 0;
    }

    public init( trace:QlogConnection ) {
        this.currentEvent = undefined;
    }

    public timeToMilliseconds(time: number | string): number {
        return parseFloat(time as any);
    }

    public load( evt:IQlogRawEvent ) : IQlogEventParser {
        this.currentEvent = evt;

        return this;
    }
}
