import {Thumbnail} from "@shopify/polaris";
import PolarisActionButton from "./PolarisActionButton.jsx";

export default (props) => {
    return <div className="Polaris-Page-Header Polaris-Page-Header--isSingleRow Polaris-Page-Header--noBreadcrumbs
    Polaris-Page-Header--longTitle Polaris-Page-Header--separator">
            <div className="Polaris-Page-Header__Row">
                <div class="Header-Thumbnail" ><Thumbnail source={props.thumbnail} /></div>
                <div className="Polaris-Page-Header__TitleWrapper">
                    <div className="Polaris-Header-Title__TitleWithMetadataWrapper"><h1
                        className="Polaris-Header-Title Polaris-Header-Title__TitleWithSubtitle">{props.title}</h1>
                    </div>
                    <div className="Polaris-Header-Title__SubTitle"><p>{props.subtitle}</p></div>
                </div>
                {props.primaryAction && <PolarisActionButton primaryAction={props.primaryAction} loading={props.loading}/>}
                <div className="Polaris-Page-Header__RightAlign"></div>
            </div>
        </div>
}