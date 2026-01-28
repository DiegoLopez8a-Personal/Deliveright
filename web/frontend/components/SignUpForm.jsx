import {useState} from "react";
import {
	Card,
	Form,
	Page,
	TextField,
	InlineError,
	Select,
} from "@shopify/polaris";
import { useAuthenticatedFetch } from "../hooks";
import PageHeader from "./PageHeader.jsx";
import {logo} from '../assets/index.js';
import FadeIn from "./FadeIn.tsx";

const usStates = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
];

const submitForm = async (data, setData, errors, setErrors, setLoading, fetch, setToastProps) => {
	// Default values
	const hardCodedData = { //TODO: needs a better logic... what is this?
		type: 4,
		phone: "345345",
		geolocation: null,
	};

	const valid = await formValidation(data, setData, errors, setErrors, setLoading);
	if (valid) {
		setLoading(true);
		let config = {
			method: "post",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({...data, ...hardCodedData}),
		};

		try {
			const res = await fetch("/api/store", config);
			if (!res.ok) throw new Error(res);
			setToastProps({
				content: "Your Deliveright account has been created successfully. Please check your email to activate the account and set your password.",
				error: false,
			});
			setTimeout(() => {
				location.reload();
			}, 1000);
		} catch (err) {
			setLoading(false);
			setErrors({...errors, unknownError: true});
			try {
				if (err.response.data.error.message) {
					setToastProps({
						content: err.response.data.error.message,
						error: true,
					});
				} else {
					throw {};
				}
			} catch {
				setToastProps({
					content: "An error has occurred, please try again.",
					error: true,
				});
			}
		}
	}
};

const formValidation = (data, setData, errors, setErrors) => {
	setErrors({...errors, unknownError: true});
	return new Promise((resolve, reject) => {
		let valid = true;
		let local_errors = {...errors};
		for (let key in data) {
			if (key !== "address" && !data[key]) {
				valid = false;
				local_errors[key] = true;
			} else {
				local_errors[key] = false;
			}
		}
		if (!data.address.address1) {
			valid = false;
			local_errors.address = true;
		} else {
			local_errors.address = false;
		}
		if (!data.company) {
			valid = false;
			local_errors.company = true;
		} else {
			local_errors.company = false;
		}
		if (!data.address.zip) {
			valid = false;
			local_errors.zip = true;
		} else {
			local_errors.zip = false;
		}
		if (!data.address.city) {
			valid = false;
			local_errors.city = true;
		} else {
			local_errors.city = false;
		}
		if (!data.address.state) {
			valid = false;
			local_errors.state = true;
		} else {
			local_errors.state = false;
		}
		setErrors(local_errors);
		if (valid) {
			resolve(true);
		} else {
			reject(undefined);
		}
	});
};

export default function SignupForm(props) {
	const [data, setData] = useState({
		email: "",
		first_name: "",
		last_name: "",
		company: "",
		address: {
			address1: "",
			address2: "",
			city: "Miami",
			state: "FL",
			zip: "",
		},
	});
	const [errors, setErrors] = useState({
		email: false,
		first_name: false,
		last_name: false,
		address: false,
		company: false,
		zip: false,
		city: false,
		state: false,
		unknownError: false,
	});
	const [loading, setLoading] = useState(false);
	const fetch = useAuthenticatedFetch();

	return (
		<Page>
			<PageHeader
				title="Deliveright - The world's most advanced white glove delivery network"
				subtitle="Please sign up."
				thumbnail={logo}
				primaryAction={{
					content: "Save",
					onAction: () => submitForm(data, setData, errors, setErrors, setLoading, fetch, props.setToastProps),
				}}
				loading={loading}
			/>

			<FadeIn>
				<br />
				<Form>
					<div style={{ width: "70%" }}>
						<Card title="Shipper Information" sectioned>
							<TextField
								disabled={loading}
								value={data.company}
								onChange={(value) => {
									setData({ ...data, company: value });
									setErrors({ ...errors, company: false });
								}}
								label="Company"
								type="company"
								helpText={
									<span>
										This is your company name
									</span>
								}
							/>
							{errors.company ? (
								<InlineError message="Company is required" />
							) : null}
							<br />
							<div style={{ display: "inline-flex", width: "100%" }}>
								<div style={{ marginRight: 10, width: "50%" }}>
									<TextField
										disabled={loading}
										value={data.first_name}
										onChange={(value) => {
											setData({ ...data, first_name: value });
											setErrors({ ...errors, first_name: false });
										}}
										label="First Name"
										id="first_name"
									/>
									{errors.first_name ? (
										<InlineError message="First name is required" />
									) : null}
								</div>

								<div style={{ width: "50%" }}>
									<TextField
										disabled={loading}
										value={data.last_name}
										onChange={(value) => {
											setData({ ...data, last_name: value });
											setErrors({ ...errors, last_name: false });
										}}
										label="Last Name"
										id="last_name"
									/>
									{errors.last_name ? (
										<InlineError message="Last name is required" />
									) : null}
								</div>
							</div>
							<br />
							<TextField
								disabled={loading}
								value={data.email}
								onChange={(value) => {
									setData({ ...data, email: value });
									setErrors({ ...errors, email: false });
								}}
								label="Email"
								type="email"
								helpText={
									<span>
										We’ll use this email address to send you an invoice.
									</span>
								}
							/>
							{errors.email ? (
								<InlineError message="Email is required" />
							) : null}
							<br />
							<TextField
								disabled={loading}
								value={data.address.address1}
								onChange={(value) => {
									setData({ ...data, address: { ...data.address, address1: value } });
									setErrors({ ...errors, address: false });
								}}
								label="Address"
								helpText={
									<span>
										We’ll use this address as your default origin address.
									</span>
								}
							/>
							{errors.address ? (
								<InlineError message="Address is required" fieldID="myFieldID" />
							) : null}
							<br />
							<TextField
								disabled={loading}
								value={data.address.address2}
								onChange={(value) => {
									setData({ ...data, address: { ...data.address, address2: value } });
								}}
								label="Address 2 (optional)"
								helpText={
									<span>
										Additional address details, if needed.
									</span>
								}
							/>
							<br />
							<div style={{ display: "inline-flex", width: "100%" }}>
								<div style={{ marginRight: 10, width: "50%" }}>
									<TextField
										disabled={loading}
										value={data.address.city}
										onChange={(value) => {
											setData({ ...data, address: { ...data.address, city: value } });
											setErrors({ ...errors, city: false });
										}}
										label="City"
										helpText={
											<span>
												The city for your default origin address.
											</span>
										}
									/>
									{errors.city ? (
										<InlineError message="City is required" />
									) : null}
								</div>
								<div style={{ width: "50%" }}>
									<Select
										disabled={loading}
										label="State"
										options={usStates}
										value={data.address.state}
										onChange={(value) => {
											setData({ ...data, address: { ...data.address, state: value } });
											setErrors({ ...errors, state: false });
										}}
										helpText={
											<span>
												Select the state for your default origin address.
											</span>
										}
									/>
									{errors.state ? (
										<InlineError message="State is required" />
									) : null}
								</div>
							</div>
							<br />
							<TextField
								disabled={loading}
								value={data.address.zip}
								onChange={(value) => {
									setData({ ...data, address: { ...data.address, zip: value } });
									setErrors({ ...errors, zip: false });
								}}
								label="Zip Code"
								helpText={
									<span>
										The zip code for your default origin address.
									</span>
								}
							/>
							{errors.zip ? (
								<InlineError message="Zip is required" fieldID="myFieldID" />
							) : null}
						</Card>
					</div>
				</Form>
			</FadeIn>
		</Page>
	);
}