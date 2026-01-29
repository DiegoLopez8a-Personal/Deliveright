/**
 * @fileoverview Main Dashboard Component
 *
 * The central hub of the application for authenticated users.
 * Displays user status, carrier service alerts, settings, and quick links.
 *
 * Components:
 * - PageHeader: Welcome message and user info
 * - CarrierServiceError: Alert if carrier service is missing
 * - LoginToGrasshopperCard: Link to external dashboard
 * - DisplayForm: Read-only view of account settings
 * - LinksCard: Helpful resources
 *
 * @module components/Dashboard
 * @requires @shopify/polaris
 */

import {Page} from "@shopify/polaris";
import CarrierServiceError from './carrierServiceError.jsx'
import {logo} from '../assets/index.js'
import PageHeader from "./PageHeader.jsx";
import LinksCard from "./LinksCard.jsx";
import LoginToGrasshopperCard from "./LoginToGrasshopperCard.jsx";
import DisplayForm from "./DisplayForm.jsx";
import FadeIn from "./FadeIn.tsx";
import { ProductsCard } from "./ProductsCard.jsx";
import PolarisActionButton from "./PolarisActionButton.jsx";

/**
 * Dashboard Component
 *
 * Renders the main user interface for the app.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - User/Store data object
 * @param {string} props.user.name - User name
 * @param {boolean} props.user.carrier - Carrier service status
 * @param {Function} props.setToastProps - Toast notification setter
 * @returns {JSX.Element} Dashboard page
 */
export default function Dashboard(props) {
	console.log(props)
	return <Page>
			<FadeIn>
				<PageHeader
					title="Deliveright - The world's most advanced white glove delivery network"
					subtitle={`Welcome, ${props.user.name}`}
					thumbnail={logo}
				/>
				{
					props.user.carrier ? null : <CarrierServiceError setToastProps={props.setToastProps} afterActivate={() => {
						props.user.carrier = true;
						this.setState({})
						sessionStorage.setItem("store", JSON.stringify(props.user))
					}}/>
				}
				<LoginToGrasshopperCard />

				<div style={{ display: "inline-flex", width: "100%", marginTop: 40 }}>
					<DisplayForm user={props.user}/>
					<LinksCard />
					{/* <PolarisActionButton/> */}
				</div>
			</FadeIn>
		</Page>
		;
}
