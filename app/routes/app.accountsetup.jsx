import { TitleBar } from "@shopify/app-bridge-react"
import{
    Text,
    Card,
    BlockStack,
    Page,
    Layout
} from "@shopify/polaris"

export default function AccountSetup() {
    return (
    <Page>
      <TitleBar title="AccountSetup" />
      <Layout>
        <Layout.Section>
            <Card>
                <BlockStack>
                    <Text as="p">
                        connect your store with us.
                    </Text>
                </BlockStack>
                
            </Card>
        </Layout.Section>
      </Layout>
    </Page>)
}