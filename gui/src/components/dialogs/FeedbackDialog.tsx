import { Button, Input, SecondaryButton } from "..";
import { useAppDispatch } from "../../redux/hooks";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";

export default function FeedbackDialog() {
  const dispatch = useAppDispatch();

  return (
    <div className="mx-auto flex max-w-md flex-col p-6 pt-8">
      <div className="flex items-center gap-2 font-medium">
        <span>👋</span>
        <span>Continueの改善にご協力ください</span>
      </div >

      <p className="text-foreground leading-relaxed">
        Continueをより良くするために常に努力しており、ぜひ皆様の声をお聞かせください。
        もしよろしければ、以下の項目にご記入をお願いいたします。
      </p>

      <form
        onSubmit={(e: any) => {
          e.preventDefault();
          dispatch(
            setDialogMessage(
              <div className="p-6 text-center">
                <div className="mb-2">✓ ありがとうございます！</div >
                <p className="text-foreground">後ほどご連絡いたします。</p>
              </div >
,
            ),
          );

          // Auto-close after 2 seconds
          setTimeout(() => {
            dispatch(setShowDialog(false));
            dispatch(setDialogMessage(undefined));
          }, 2000);
        }}
        className="flex flex-col gap-3"
      >
        <Input type="text" name="name" placeholder="お名前" required />
        <Input type="email" name="email" placeholder="メールアドレス" required />
        <div className="mt-2 flex justify-between gap-2">
          <SecondaryButton
            className="flex-1"
            type="button"
            onClick={() => {
              dispatch(setShowDialog(false));
              dispatch(setDialogMessage(undefined));
            }}
          >
            今はしない
          </SecondaryButton>
          <Button className="flex-1" type="submit">
            送信
          </Button>
        </div>
      </form>

      <p className="text-description-muted">
        この情報はフィードバックのための連絡のみに使用されます。
      </p>
    </div>
  );
}
