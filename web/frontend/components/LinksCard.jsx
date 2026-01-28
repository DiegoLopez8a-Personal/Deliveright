import {Card, List} from "@shopify/polaris";

export default () => {
    return <div class="links_card">
        <Card title="Related Pages" sectioned>
            <List>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/services/">Service Levels</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/coverage/">Coverage</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/terms-conditions/">Terms and Conditions</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/claims-policy/">Claims Policy</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/contact-us/">Contact us</a>
                </List.Item>
            </List>
        </Card>
    </div>

}