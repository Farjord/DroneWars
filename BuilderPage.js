import React, { useEffect, useState } from 'react';
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react';

// 1. Initialize the Builder SDK with your Public API Key
// This line should be present near the top of your application's entry point 
// (e.g. App.js, or index.js/main.js), but it's often placed here as well for simplicity.
// Ensure you have already run builder.init(process.env.REACT_APP_PUBLIC_BUILDER_KEY)
// in your main application file as per the previous step.

export default function BuilderPage() {
  const isPreviewingInBuilder = useIsPreviewing();
  const [content, setContent] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      // Get the page content from Builder based on the current URL path
      const content = await builder
        .get('page', {
          url: window.location.pathname
        })
        .promise();

      setContent(content);
      // If content is null and we are NOT in the visual editor, set 404
      setNotFound(!content && !isPreviewingInBuilder);
    }

    fetchContent();
  }, [isPreviewingInBuilder]); // Re-run if we enter/exit preview mode

  if (content === null) {
    // KPI: Add a skeleton placeholder while loading
    // While content is loading, render a simple 'Loading...' state
    return <div>Loading page...</div>;
  }

  if (notFound) {
    // If no page is found in Builder, return your application's 404 page
    return <div>404 Page Not Found</div>;
  }

  // Render the Builder page content
  return (
    <BuilderComponent model="page" content={content} />
  );
}