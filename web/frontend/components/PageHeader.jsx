/**
 * @fileoverview Custom Page Header Component
 *
 * A specialized header component that mimics the Shopify Admin page header
 * but adds support for a thumbnail image and custom subtitle layout.
 *
 * Features:
 * - Thumbnail image support
 * - Title and Subtitle
 * - Primary action button with loading state
 * - Custom CSS classes for layout control
 *
 * @module components/PageHeader
 * @requires @shopify/polaris
 * @requires ./PolarisActionButton
 */

import {Thumbnail} from "@shopify/polaris";
import PolarisActionButton from "./PolarisActionButton.jsx";

/**
 * Page Header Component
 *
 * Renders a header section with an image, title, description, and action button.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Main title text
 * @param {string} props.subtitle - Subtitle/Description text
 * @param {string} props.thumbnail - Source URL for thumbnail image
 * @param {Object} [props.primaryAction] - Primary action configuration
 * @param {boolean} [props.loading] - Loading state for action button
 * @returns {JSX.Element} Rendered page header
 */
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