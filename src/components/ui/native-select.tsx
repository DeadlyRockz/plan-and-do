import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import * as React from "react";

/**
 * The platform select, styled. It is the most robust choice for keyboards, screen readers and
 * mobile pickers, and needs no client JavaScript.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        data-slot="native-select"
        data-placeholder={props.value === "" ? true : undefined}
        className="min-h-11 w-full min-w-0 appearance-none rounded-md border bg-card py-2 pr-10 pl-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground sm:rounded-lg"
        {...props}
      />
      <CaretDownIcon
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

export { NativeSelect, NativeSelectOption };
