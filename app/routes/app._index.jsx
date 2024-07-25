import React from "react";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { Page, Layout, Text, Card, Button, BlockStack, InlineStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
export const loader = async ({ request }) => {
    try {
        // console.log("Started the loader!",request);
        const { admin } = await authenticate.admin(request);
        console.log("Authenticated successfully.");
        const response = await admin.graphql(`
            query shopInfo {
                shop {
                    name
                    url
                    myshopifyDomain
                    plan {
                        displayName
                        partnerDevelopment
                        shopifyPlus
                    }
                    email
                }
            }
        `);
        const responseJson = await response.json();
        console.log("Shop details fetched:", responseJson);

        const vendorEndpoint = "https://aurastage.unthink.ai/users/store/get_details/";
        // const shopName = responseJson.data.shop.name;
        const shopName = 'heroesvillains'
        const vendorRequest = new URL(vendorEndpoint);
        vendorRequest.searchParams.append("store_name", shopName);

        const vendorResponse = await fetch(vendorRequest);
        const vendorData = vendorResponse.ok ? await vendorResponse.json() : null;
        // console.log("vendor details : ",vendorData)
        return json({
            shopDetails: responseJson.data.shop,
            vendorDetails: vendorData?.data || null,
        });
    } catch (error) {
        console.error("Error in loader:", error);
        return json({
            shopDetails: null,
            vendorDetails: null,
        });
    }
};
export const action = async ({ request }) => {
    console.log("triggered the action on connect store");
    try {
        const formData = await request.formData();
        const shopName = formData.get("shopName");
        const email = formData.get("email");
        const password = formData.get("password");

        const response = await fetch("https://aurastage.unthink.ai/users/store/create/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                store_name: shopName,
                emailId: email,
                password: password,
            }),
        });

        // console.log("response on create store", response);
        if (!response.ok) {
            console.log("error occurred store creation failed");
            throw new Error("Failed to connect store");
        }

        const result = await response.json();
        if (result?.status_code === 200) {
            // console.log("the result is success", result);
            return json({ success: true, result });
        } else {
            // console.log("the result is failed", result);
            return json({ success: false, error: result?.status_description });
        }

    } catch (error) {
        console.error("Error in action:", error);
        return json({ success: false, error: error.message });
    }
};


export default function Index() {
    const nav = useNavigation();
    const actionData = useActionData();
    const loaderData = useLoaderData();
    const submit = useSubmit();
    const { shopDetails, vendorDetails } = loaderData;

    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

    const connectStore = () => {
        const formData = new FormData();
        formData.append("shopName", shopDetails.name);
        formData.append("email", shopDetails.email);
        formData.append("password", shopDetails.email); // Assuming password is the same as the email as per your instruction
        submit(formData, { method: "post" });
    };

    return (
        <Page>
            <TitleBar title="Unthink Store connect" />
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <BlockStack gap="200">
                                    <Text as="h2" variant="headingMd">
                                        WELCOME TO UNTHINK 🎉
                                    </Text>
                                    <Text variant="bodyMd" as="p">
                                        Welcome to the future of retail and e-commerce, where technology and real people come together to create a seamless and personalized shopping experience.
                                    </Text>
                                </BlockStack>
                                <BlockStack gap="200">
                                    <Text as="h3" variant="headingMd">
                                        Get started by connecting your store
                                    </Text>
                                </BlockStack>
                                <InlineStack gap="300">
                                    {vendorDetails && vendorDetails.length > 0 ? (
                                        <p>You have already connected the store.</p>
                                    ) : (
                                        <Button loading={isLoading} onClick={connectStore}>
                                            Connect Store
                                        </Button>
                                    )}
                                </InlineStack>
                                {actionData && (
                                    <Text variant="bodyMd" as="p">
                                        {actionData.success
                                            ? "Store connected successfully!"
                                            : `Failed to connect store: ${actionData.error}`}
                                    </Text>
                                )}
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
