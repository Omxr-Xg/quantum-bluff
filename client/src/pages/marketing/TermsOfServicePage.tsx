import { useTranslation } from "react-i18next";
import { getSiteContent } from "../../content/marketing/siteContent";
import { MarketingTextPage } from "./MarketingTextPage";

export function TermsOfServicePage() {
  const { i18n, t } = useTranslation();
  const terms = getSiteContent(i18n.language).terms;
  return (
    <MarketingTextPage
      title={terms.title}
      canonicalPath="/terms-of-service"
      lastUpdated={`${t("publicSite.lastUpdated")} ${terms.lastUpdated}`}
      sections={terms.sections}
    />
  );
}
