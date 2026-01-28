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
