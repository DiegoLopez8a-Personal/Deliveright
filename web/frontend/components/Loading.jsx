/**
 * @fileoverview Loading State Component
 *
 * Renders a full-page loading skeleton using Polaris components.
 * Used to indicate that the application is fetching initial data
 * or performing a heavy background operation.
 *
 * Structure:
 * - Loading Bar (Top)
 * - Skeleton Page Layout
 * - Skeleton Cards (3 primary, 2 secondary)
 *
 * @module components/Loading
 * @requires @shopify/polaris
 */

import {
  Card,
  TextContainer,
  Layout,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonPage,
  Frame,
  Loading,
} from "@shopify/polaris";

/**
 * Loading Skeleton Component
 *
 * Displays a placeholder layout while content is loading.
 * mimics the structure of the main dashboard to prevent layout shift.
 *
 * @component
 * @returns {JSX.Element} Full page loading skeleton
 */
export default function LoadingSkeleton() {
  return (
      <>
        <div style={{height: "10px"}}>
          <Frame>
            <Loading/>
          </Frame>
        </div>
        <SkeletonPage primaryAction secondaryActions={2}>
          <Layout>
            <Layout.Section>
              <Card sectioned>
                <SkeletonBodyText/>
              </Card>
              <Card sectioned>
                <TextContainer>
                  <SkeletonDisplayText size="small"/>
                  <SkeletonBodyText/>
                </TextContainer>
              </Card>
              <Card sectioned>
                <TextContainer>
                  <SkeletonDisplayText size="small"/>
                  <SkeletonBodyText/>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section secondary>
              <Card>
                <Card.Section>
                  <TextContainer>
                    <SkeletonDisplayText size="small"/>
                    <SkeletonBodyText lines={2}/>
                  </TextContainer>
                </Card.Section>
                <Card.Section>
                  <SkeletonBodyText lines={1}/>
                </Card.Section>
              </Card>
              <Card subdued>
                <Card.Section>
                  <TextContainer>
                    <SkeletonDisplayText size="small"/>
                    <SkeletonBodyText lines={2}/>
                  </TextContainer>
                </Card.Section>
                <Card.Section>
                  <SkeletonBodyText lines={2}/>
                </Card.Section>
              </Card>
            </Layout.Section>
          </Layout>
        </SkeletonPage>
      </>
  );
}
