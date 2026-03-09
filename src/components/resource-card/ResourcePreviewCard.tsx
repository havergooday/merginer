import type { CSSProperties } from "react";

import { ResourceCardArt } from "@/components/resource-card/ResourceCardArt";
import { ResourceCardHeader } from "@/components/resource-card/ResourceCardHeader";
import { ResourceCardNavigation } from "@/components/resource-card/ResourceCardNavigation";
import { ResourceCardBody } from "@/components/resource-card/body/ResourceCardBody";
import {
  getArtLabel,
  getArtSrc,
  getBodySlotClassName,
  getExploreArtState,
  getFrameSrc,
  getHeaderStatus,
  getHeaderTitle,
  getIsCommonNavigationLocked,
  getOverlayLogs,
} from "@/components/resource-card/model/presentation";
import type { ResourcePreviewCardProps } from "@/components/resource-card/types";

export const ResourcePreviewCard = (props: ResourcePreviewCardProps) => {
  const frameSrc = getFrameSrc(props);
  const headerTitle = getHeaderTitle(props);
  const headerStatus = getHeaderStatus(props);
  const artLabel = getArtLabel(props);
  const artSrc = getArtSrc(props);
  const exploreArtState = getExploreArtState(props);
  const overlayLogs = getOverlayLogs(props);
  const isCommonNavigationLocked = getIsCommonNavigationLocked(props);
  const bodySlotClassName = getBodySlotClassName(props);
  const isBangImpactActive =
    (props.enhanceFxState === "success" || props.enhanceFxState === "fail") &&
    props.location === "forge" &&
    props.forgeSubTab === "enhance";
  const bangImpactToneClass =
    props.enhanceFxState === "fail" ? "bang-impact-fail" : "bang-impact-success";

  return (
    <section
      className={`resource-card-frame ${isBangImpactActive ? `bang-impact-active ${bangImpactToneClass}` : ""}`}
      style={{ "--resource-frame-src": `url(${frameSrc})` } as CSSProperties}
    >
      {isBangImpactActive ? (
        <div className="resource-lightning-overlay" aria-hidden>
          <div className="resource-lightning-line" />
          <div className="resource-lightning-line resource-lightning-line-secondary" />
        </div>
      ) : null}
      <div className="resource-card-content">
        <ResourceCardHeader
          title={headerTitle}
          status={headerStatus}
          currentHp={props.currentHp}
          maxHp={props.maxHp}
        />

        <div className="resource-card-separator" aria-hidden />

        <ResourceCardArt
          artSrc={artSrc}
          artLabel={artLabel}
          overlayLogs={overlayLogs}
          exploreArtState={exploreArtState}
        />

        <div className="resource-card-separator" aria-hidden />

        <div className={bodySlotClassName}>
          <ResourceCardBody {...props} />
        </div>

        <div className="resource-card-separator" aria-hidden />

        <ResourceCardNavigation
          isCommonNavigationLocked={isCommonNavigationLocked}
          location={props.location}
          actions={props.actions}
        />
      </div>
    </section>
  );
};


