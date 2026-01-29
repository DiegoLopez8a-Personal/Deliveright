/**
 * @fileoverview Custom Action Button Component
 *
 * A custom implementation of a primary action button that mimics Polaris styling
 * but allows for more granular control over loading states and DOM structure.
 *
 * Why Custom?
 * Standard Polaris PageActions don't always offer the flexibility needed
 * for specific loading animations or custom class injections required here.
 *
 * @module components/PolarisActionButton
 * @requires react
 */

/**
 * Polaris Action Button
 *
 * Renders a primary button that toggles between a standard state and a loading state.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.primaryAction - Action configuration
 * @param {string} props.primaryAction.content - Button text
 * @param {Function} props.primaryAction.onAction - Click handler
 * @param {boolean} [props.loading] - Whether to show loading spinner
 * @returns {JSX.Element} Rendered button
 */
export default (props) => {
    const buttonSave =
        <button onClick={props.primaryAction.onAction} className="Polaris-Button Polaris-Button--primary" type="button">
            <span className="Polaris-Button__Content">
                <span className="Polaris-Button__Text">{props.primaryAction.content}</span>
            </span>
        </button>

    const buttonLoading =
        <button className="Polaris-Button Polaris-Button--primary Polaris-Button--disabled Polaris-Button--loading"
                type="button"  aria-disabled="true" aria-busy="true" tabIndex="-1">
            <span className="Polaris-Button__Content">
                <span className="Polaris-Button__Spinner">
                    <span className="Polaris-Spinner Polaris-Spinner--sizeSmall">
                        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.229 1.173a9.25 9.25 0 1011.655 11.412 1.25 1.25 0 10-2.4-.698 6.75 6.75 0 11-8.506-8.329 1.25 1.25 0 10-.75-2.385z"></path>
                        </svg>
                    </span>
                    <span role="status">
                        <span className="Polaris-VisuallyHidden">Loading</span>
                    </span>
                </span>
                <span className="Polaris-Button__Text">{props.primaryAction.content}</span>
            </span>
        </button>

    return <div className="Polaris-Page-Header__PrimaryActionWrapper">
        {props.loading ? buttonLoading : buttonSave}
    </div>
}