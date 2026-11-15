import { SecondaryButton } from "../..";
import ContinueLogo from "../../svg/ContinueLogo";

export function OnboardingCardLanding({
  onSelectConfigure,
  isDialog,
}: {
  onSelectConfigure: () => void;
  isDialog?: boolean;
}) {
  return (
    <div className="max-full flex w-full flex-col items-center justify-center px-4 text-center xs:px-0">
      <div className="hidden xs:flex">
        <ContinueLogo height={75} />
      </div>

      <p className="mb-5 mt-0 w-full">
        モデルを設定して、AIを活用したコーディングを始めましょう
      </p>

      <SecondaryButton onClick={onSelectConfigure} className="w-full">
        モデルを設定する
      </SecondaryButton>
    </div>
  );
}
