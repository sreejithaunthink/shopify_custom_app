import { useLoaderData, useActionData, useSubmit } from '@remix-run/react';
import { useState, useCallback, useEffect } from 'react';
import { IndexTable, Card, Tabs, Text, Button } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const shopifyCollectionsQuery = `
    query {
      collections(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `;
  const response = await admin.graphql(shopifyCollectionsQuery);
  const collectionData = await response.json();
  const collections = collectionData.data.collections.edges.map(edge => ({
    id: edge.node.id,
    name: edge.node.title,
  }));
  console.log(collections)
  return json({ collections });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const selectedCollectionIds = formData.getAll('selectedCollectionIds');
  const { admin } = await authenticate.admin(request);

  for (const collectionId of selectedCollectionIds) {
    try {
      const response = await admin.graphql(`
        mutation {
          collectionCreate(input: { title: "${collectionId}" }) {
            collection {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `);

      const responseData = await response.json();

      if (responseData.data.collectionCreate.userErrors.length) {
        return json({
          success: false,
          errors: responseData.data.collectionCreate.userErrors
        });
      }
    } catch (error) {
      return json({ success: false, error: error.message });
    }
  }

  return json({ success: true });
};

export default function Collections() {
  const { collections } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [selectedResources, setSelectedResources] = useState([]);
  console.log(selectedResources)
  const [allResourcesSelected, setAllResourcesSelected] = useState(false);
  const [unthinkCollections, setUnthinkCollections] = useState([]);
  const [selected, setSelected] = useState(0);
  const [selectedCollectionDetails, setSelectedCollectionDetails] = useState([]);

  const handleSelectionChange = useCallback((selectionType, toggleType, selection, selectedDetails) => {
    if (selectionType === 'all') {
      if (toggleType === 'selectAll') {
        setAllResourcesSelected(true);
        setSelectedResources(collections.map(resource => resource.id.toString()));
        setSelectedCollectionDetails(collections.map(resource => ({ id: resource.id, name: resource.name })));
      } else if (toggleType === 'deselectAll') {
        setAllResourcesSelected(false);
        setSelectedResources([]);
        setSelectedCollectionDetails([]);
      }
    } else {
      setAllResourcesSelected(false);
      setSelectedResources(selection);
      setSelectedCollectionDetails(selectedDetails);
    }
  }, [collections]);

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelected(selectedTabIndex);
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      if (selected === 1) {
        try {
          const collectionFetchUrl = 'https://aurastage.unthink.ai/user/collections/fetch_collections/';
          const collectionRequest = new URL(collectionFetchUrl);
          collectionRequest.searchParams.append("user_id", "171562091648557");
          collectionRequest.searchParams.append("store", "heroesvillains");
          collectionRequest.searchParams.append("view", "public");

          const collectionResponse = await fetch(collectionRequest);
          if (collectionResponse.ok) {
            const data = await collectionResponse.json();
            setUnthinkCollections(data.data || []);
          } else {
            console.error('Error fetching collections:', collectionResponse.statusText);
          }
        } catch (error) {
          console.error('Error fetching collections:', error);
        }
      }
    };

    fetchCollections();
  }, [selected]);

  const handlePublishToShopify = () => {
    const formData = new FormData();
    selectedResources.forEach(id => {
      formData.append('selectedCollectionIds', id);
    });
    submit(formData, { method: 'post' });
  };

  const resourceName = {
    singular: 'collection',
    plural: 'collections',
  };

  const rowMarkup = collections.map((collection, index) => (
    <IndexTable.Row
      id={collection.id.toString()}
      key={collection.id}
      selected={selectedResources.includes(collection.id.toString())}
      position={index}
      onClick={() => handleSelectionChange('single', selectedResources.includes(collection.id.toString()) ? 'deselect' : 'select', [collection.id.toString()], [collection])}
    >
      <IndexTable.Cell>
        <Text>{collection.name}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const unthinkRowMarkup = unthinkCollections.map((collection, index) => (
    <IndexTable.Row
      id={collection._id}
      key={collection._id}
      selected={selectedResources.includes(collection._id)}
      position={index}
      onClick={() => handleSelectionChange('single', selectedResources.includes(collection._id) ? 'deselect' : 'select', [collection._id], [collection])}
    >
      <IndexTable.Cell>
        <Text>{collection.collection_name}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const tabs = [
    { id: 'shopify', content: 'Collections from Shopify' },
    { id: 'unthink', content: 'Collections from Unthink' },
  ];

  const selectedCount = selectedResources.length;

  return (
    <div>
      <h1>Collections</h1>
      {collections.length > 0 ? (
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          <Card title={tabs[selected].content}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
              <IndexTable
                resourceName={resourceName}
                itemCount={selected === 0 ? collections.length : unthinkCollections.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedCount}
                onSelectionChange={(selectionType, toggleType, selection) => {
                  console.log(selectionType,toggleType,selection)
                  const selectedDetails = selection.map(id => collections.find(c => c.id.toString() === id) || unthinkCollections.find(c => c._id === id));
                  handleSelectionChange(selectionType, toggleType, selection, selectedDetails);
                }}
                headings={[{ title: 'All/Selected' }]}
                style={{ flex: 1 }}
              >
                {selected === 0 ? rowMarkup : unthinkRowMarkup}
              </IndexTable>
              {selected === 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                  <Button primary onClick={handlePublishToShopify}>Publish to Shopify</Button>
                </div>
              )}
            </div>
          </Card>
        </Tabs>
      ) : (
        <p>No collections found</p>
      )}
      {actionData && (
        <Text variant="bodyMd" as="p">
          {actionData.success
            ? "Collections published successfully!"
            : `Failed to publish collections: ${actionData.errors || actionData.error}`}
        </Text>
      )}
    </div>
  );
}
