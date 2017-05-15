import { Promise } from 'es6-promise';
import { esriPromise } from 'esri-promise';
import * as React from 'react';
import ArcContainer from './ArcContainer';

export interface BaseProps {
    id: string;
    style?: {
        [propName: string]: any;
    };
    mapProperties?: __esri.WebMapProperties | __esri.WebSceneProperties;
    viewProperties?: __esri.MapViewProperties | __esri.SceneViewProperties;
    viewWatchables?: string[];
    onClick?: (e: EventProperties) => any;
    onDoubleClick?: (e: EventProperties) => any;
    onDrag?: (e: EventProperties) => any;
    onHold?: (e: EventProperties) => any;
    onKeyDown?: (e: EventProperties) => any;
    onKeyUp?: (e: EventProperties) => any;
    onLayerViewCreate?: (e: EventProperties) => any;
    onLayerViewDestroy?: (e: EventProperties) => any;
    onMouseWheel?: (e: EventProperties) => any;
    onPointerDown?: (e: EventProperties) => any;
    onPointerMove?: (e: EventProperties) => any;
    onPointerUp?: (e: EventProperties) => any;
    onResize?: (e: EventProperties) => any;
    onLoad?: (map: __esri.Map, view: __esri.MapView | __esri.SceneView) => any;
    onFail?: (e: any) => any;
    loadComponent?: any;
    failComponent?: any;
};

interface ArcProps extends BaseProps {
    scriptUri: string[];
}

interface EventProperties {
    [propName: string]: any;
}

interface ComponentState {
    map: __esri.WebMap;
    mapContainerId: string;
    mapProperties: __esri.MapProperties;
    mapWatchables: string[];
    view: __esri.MapView | __esri.SceneView;
    viewProperties: __esri.MapViewProperties | __esri.SceneViewProperties;
    viewWatchables: string[];
    status: string;
}

const eventMap = {
    onClick: 'click',
    onDoubleClick: 'double-click',
    onDrag: 'drag',
    onHold: 'hold',
    onKeyDown: 'key-down',
    onKeyUp: 'key-up',
    onLayerViewCreate: 'layerview-create',
    onLayerViewDestroy: 'layerview-destroy',
    onMouseWheel: 'mouse-wheel',
    onPointerDown: 'pointer-down',
    onPointerMove: 'pointer-move',
    onPointerUp: 'pointer-up',
    onResize: 'resize'
};

export class WebView extends React.Component<ArcProps, ComponentState> {
    constructor(props) {
        super(props);
        this.state = {
            map: null,
            mapContainerId: Math.random().toString(36).substring(0, 14),
            mapProperties: this.props.mapProperties,
            mapWatchables: ['allLayers', 'basemap', 'declaredClass', 'ground', 'layers'],
            status: 'loading',
            view: null,
            viewProperties: this.props.viewProperties,
            viewWatchables: this.props.viewWatchables,
        }
        this.loadMap = this.loadMap.bind(this);
        this.handleErr = this.handleErr.bind(this);
        this.registerStateChanges = this.registerStateChanges.bind(this);
    }

    public render() {
        const centerStyle = {
            left: '50%',
            marginRight: '-50%',
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)'
        };
        const mapStyle = { position: 'relative', width: '100%', height: '100%', ...this.props.style };
        const loadElement = (this.props.loadComponent ? <this.props.loadComponent /> : <h3 style={centerStyle}>Loading..</h3>);
        const failElement = (
            this.props.failComponent ? <this.props.failComponent /> :
            <h3 style={centerStyle}>The ArcGIS API failed to load.</h3>
        );
        if (this.state.status === 'loaded') {
            const childrenWithProps = React.Children.map(this.props.children, (child) => {
                const childEl = child as React.ReactElement<any>;
                return React.cloneElement(childEl, {
                        map: this.state.map,
                        view: this.state.view
                    }
                );
            });
            return (
                <div style={mapStyle}>
                    <ArcContainer id={this.state.mapContainerId} style={{ width: '100%', height: '100%' }} />
                    {childrenWithProps}
                </div>
            );
        } else if (this.state.status === 'loading') {
            return (
                <div style={mapStyle}>
                    <ArcContainer id={this.state.mapContainerId} style={{ width: '100%', height: '100%' }} />
                    {loadElement}
                </div>
            );
        }
        return (
            <div style={mapStyle}>
                {failElement}
            </div>
        );
    }

    private componentDidMount() {
        esriPromise(this.props.scriptUri.concat(['dojo/promise/all']))
            .then(
                ([WebConstructor, ViewConstructor, all]) => {
                    this.loadMap(WebConstructor, ViewConstructor, all);
                }
            ).catch(this.handleErr);
    }

    private loadMap(WebConstructor: __esri.WebMapConstructor, ViewConstructor: __esri.MapViewConstructor, all: dojo.promise.All) {
        const map: __esri.WebMap | __esri.WebScene = new WebConstructor({
            portalItem: {
                id: this.props.id
            }
        });
        map.load()
            .then(() => map.basemap.load())
            .then(() => {
                const allLayers = map.allLayers;
                const promises = allLayers.map((layer) => layer.load());
                return all(promises.toArray());
            })
            .then((layers) => {
                const view = new ViewConstructor({
                    container: this.state.mapContainerId,
                    map
                });
                this.setState({
                    status: 'loaded',
                    map,
                    view
                });
                if (this.props.onLoad) {
                    this.props.onLoad(map, view);
                }
            }).otherwise(this.handleErr);
    }

    private handleErr(err) {
        this.setState({ status: 'failed' });
    }

    private registerStateChanges(
        targetObj: __esri.WebMap | __esri.WebScene | __esri.MapView | __esri.SceneView,
        componentStateKey: string,
        watchables: string[],
        callback: (propName: string, value: any) => any
    ) {
        watchables.forEach((propKey) => {
            targetObj.watch(propKey, (newValue) => {
                const newState = {...this.state};
                newState[componentStateKey][propKey] = newValue;
                this.setState(newState);
                callback(propKey, newValue);
            });
        });
    }
};


