/**
 * @fileoverview Fade In Animation Container
 *
 * A reusable component that orchestrates a staggered fade-in animation
 * for its children. Useful for revealing lists, grids, or dashboard widgets
 * in a smooth, polished manner.
 *
 * Features:
 * - Staggered entrance for multiple children
 * - Configurable delay and duration
 * - Custom wrapper tags (div, ul, etc.)
 * - Optional visibility control
 *
 * @module components/FadeIn
 * @requires react
 */

import {
    JSXElementConstructor,
    PropsWithChildren,
    useEffect,
    useState,
    Children
} from "react";

/**
 * FadeIn Component Props
 *
 * @interface Props
 * @property {number} [delay=50] - Delay between each child's appearance (ms)
 * @property {number} [transitionDuration=400] - Duration of fade animation (ms)
 * @property {JSXElementConstructor<any>} [wrapperTag="div"] - HTML tag for parent
 * @property {JSXElementConstructor<any>} [childTag="div"] - HTML tag for children wrappers
 * @property {string} [className] - CSS class for parent
 * @property {string} [childClassName] - CSS class for children wrappers
 * @property {boolean} [visible=true] - Controls visibility state
 * @property {Function} [onComplete] - Callback fired when animation finishes
 */
interface Props {
    delay?: number;
    transitionDuration?: number;
    wrapperTag?: JSXElementConstructor<any>;
    childTag?: JSXElementConstructor<any>;
    className?: string;
    childClassName?: string;
    visible?: boolean;
    onComplete?: () => any;
}

/**
 * Fade In Component
 *
 * Wraps children and applies a staggered fade-in + slide-up animation.
 *
 * @component
 * @param {PropsWithChildren<Props>} props - Component properties
 * @returns {JSX.Element} Animated container
 */
export default function FadeIn(props: PropsWithChildren<Props>) {
    const [maxIsVisible, setMaxIsVisible] = useState(0);
    const transitionDuration = typeof props.transitionDuration === "number" ? props.transitionDuration : 400;
    const delay = typeof props.delay === "number" ? props.delay : 50;
    const WrapperTag = props.wrapperTag || "div";
    const ChildTag = props.childTag || "div";
    const visible = typeof props.visible === "undefined" ? true : props.visible;

    useEffect(() => {
        let count = Children.count(props.children);
        if (!visible) {
            // Animate all children out
            count = 0;
        }

        if (count == maxIsVisible) {
            // We're done updating maxVisible, notify when animation is done
            const timeout = setTimeout(() => {
                if (props.onComplete) props.onComplete();
            }, transitionDuration);
            return () => clearTimeout(timeout);
        }

        // Move maxIsVisible toward count
        const increment = count > maxIsVisible ? 1 : -1;
        const timeout = setTimeout(() => {
            setMaxIsVisible(maxIsVisible + increment);
        }, delay);
        return () => clearTimeout(timeout);
    }, [
        Children.count(props.children),
        delay,
        maxIsVisible,
        visible,
        transitionDuration,
    ]);

    return (
        <WrapperTag className={props.className}>
            {Children.map(props.children, (child, i) => {
                return (
                    <ChildTag
                        className={props.childClassName}
                        style={{
                            transition: `opacity ${transitionDuration}ms, transform ${transitionDuration}ms`,
                            transform: maxIsVisible > i ? "none" : "translateY(20px)",
                            opacity: maxIsVisible > i ? 1 : 0,
                        }}
                    >
                        {child}
                    </ChildTag>
                );
            })}
        </WrapperTag>
    );
}