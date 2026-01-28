import {Card, TextField} from "@shopify/polaris";

export default (props) => {
    return <div style={{width: "70%"}}>
        <Card title="Deliveright settings" sectioned>
            <div style={{display: "inline-flex", width: "100%"}}>
                <div style={{marginRight: 10, width: "50%"}}>
                    <TextField
                        disabled={true}
                        value={props.user.first_name}

                        label="First Name"
                        type="test"
                        id="name"
                    />
                </div>

                <div style={{width: "50%"}}>
                    <TextField
                        disabled={true}
                        value={props.user.last_name}

                        label="Last Name"
                        type="test"
                        id="name"
                    />
                </div>
            </div>
            <br/>
            <br/>
            <TextField
                disabled={true}
                value={props.user.company}
                label="Company"
                type="text"
                helpText={
                    <span>
											Your company name on Grasshopper.
								</span>
                }
            />

            <br/>

            <TextField
                disabled={true}
                value={props.user.email}
                label="Email"
                type="email"
                helpText={
                    <span>
											We’ll use this email address to send you an invoice.
								</span>
                }
            />

            <br/>

            <TextField
                disabled={true}
                value={props.user.address.address1}
                label="Address"
                type="address"
                helpText={
                    <span>
											We’ll use this address as your default origin address.
								</span>
                }
            />

            <br/>

            <TextField
                disabled={true}
                value={props.user.address.address2}
                label="Address 2"
                type="address"
                helpText={<span>We’ll use this address as your origin.</span>}
            />
                        
            <TextField
                disabled={true}
                value={props.user.address.state}
                label="State"
                type="text"
                helpText={<span>We’ll use this state as your origin.</span>}
            />
                        
            <TextField
                disabled={true}
                value={props.user.address.city}
                label="City"
                type="text"
                helpText={<span>We’ll use this city as your origin.</span>}
            />

            <br/>

            <TextField
                disabled={true}
                value={props.user.address.zip}
                label="Zip Code"
                type="text"
                helpText={<span>We’ll use this address as your origin.</span>}
            />
        </Card>
    </div>
}