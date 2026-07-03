/** GraphQL documents for Tina Cloud — kept separate to avoid pulling tinacms into the server bundle. */

export const HOME_QUERY = `
  query home($relativePath: String!) {
    home(relativePath: $relativePath) {
      ... on Document {
        _sys {
          filename
          relativePath
        }
        id
      }
      eyebrow
      headlinePrefix
      headlineAccent
      subheadline
      primaryCta
      secondaryCta
      previewStats {
        label
        value
        change
      }
      previewRouteText
      featuresTitle
      featuresSubtitle
      features {
        title
        desc
        icon
        wide
      }
      ctaTitle
      ctaBody
      ctaButton
      footerText
    }
  }
`;

export const PRICING_QUERY = `
  query pricing($relativePath: String!) {
    pricing(relativePath: $relativePath) {
      ... on Document {
        _sys {
          filename
          relativePath
        }
        id
      }
      title
      subtitle
      plans {
        name
        price
        period
        badge
        highlight
        features
      }
    }
  }
`;
