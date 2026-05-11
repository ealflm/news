import { PopupForm } from '../editor/popup-form';

export default function NewPopupPage() {
  return (
    <>
      <div className="mx-auto mb-6 w-full max-w-[1120px]">
        <h1 className="font-heading text-3xl font-bold text-foreground">Tạo popup mới</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Cấu hình banner, link affiliate theo platform × device, và cookie để remember.
        </p>
      </div>
      <PopupForm />
    </>
  );
}
