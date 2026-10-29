"use client";

import { PaperPlaneTiltIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_CHARACTERS } from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";
import { exampleChanges } from "@/domain/suggestions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SavedPlan } from "@/lib/storage";
import { FieldError } from "@/features/shared/field-error";
import { TYPE } from "@/components/styles";
import { useRefineChat } from "./use-refine-chat";

/** The last "Try asking" starter, after two example changes that demo mode can apply. */
const GENERAL_STARTER = "What should I book first?";

/**
 * "Ask the planner" (plan/06 §6.5): the conversation, tappable follow-ups and the message box.
 * `useRefineChat` sends each turn; if the brief changes, the plan is rebuilt and the ideas are
 * marked out of date until refreshed.
 */
export function ChatPanel({
  plan,
  today,
  disabled,
  className,
}: {
  plan: SavedPlan;
  today: IsoDate;
  disabled: boolean;
  className?: string;
}) {
  const { draft, setDraft, pending, failure, secondsLeft, announcement, send } = useRefineChat(
    plan,
    today,
  );
  const logRef = useRef<HTMLOListElement>(null);
  const turns = plan.chat;

  useEffect(() => {
    // Keep the newest message in view.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns.length, pending]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  };

  const starters = [...exampleChanges(plan.brief).slice(0, 2), GENERAL_STARTER];
  const followUps = plan.chatSuggestions ?? [];
  const pick = (suggestion: string) => void send(suggestion);

  return (
    <section aria-labelledby="chat-title" className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 id="chat-title" className={TYPE.groupTitle}>
          Ask the planner
        </h2>
        <p className="text-sm text-muted-foreground">
          Change the plan or ask a question in plain words.
        </p>
      </div>

      {turns.length > 0 || pending ? (
        <>
          <ol
            ref={logRef}
            aria-label="Conversation"
            className="flex max-h-96 flex-col gap-3 overflow-y-auto"
          >
            {turns.map((turn, index) => (
              <ChatBubble key={index} role={turn.role} text={turn.text} />
            ))}
            {pending && (
              <>
                <ChatBubble role="user" text={pending} />
                <li className="text-sm text-muted-foreground" aria-busy="true">
                  The planner is thinking
                </li>
              </>
            )}
          </ol>
          {!disabled && !pending && followUps.length > 0 && (
            <SuggestionList title="Ask next" suggestions={followUps} onPick={pick} />
          )}
        </>
      ) : (
        !disabled && <SuggestionList title="Try asking" suggestions={starters} onPick={pick} />
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {disabled ? (
        <p className="text-sm text-muted-foreground">
          This event has passed, so the plan can no longer be changed.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <Label htmlFor="chat-message">Your message</Label>
          <Textarea
            id="chat-message"
            value={draft}
            rows={2}
            maxLength={MAX_MESSAGE_CHARACTERS}
            onKeyDown={onKeyDown}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby={failure ? "chat-error" : "chat-hint"}
            aria-invalid={failure ? true : undefined}
            className="min-h-11"
          />
          {failure ? (
            <FieldError id="chat-error">
              {failure.message}
              {secondsLeft > 0 && ` You can send again in ${secondsLeft}s.`}
            </FieldError>
          ) : (
            <p id="chat-hint" className="text-sm text-muted-foreground">
              Press Enter to send, Shift and Enter for a new line.
            </p>
          )}
          <Button
            type="submit"
            disabled={!draft.trim() || Boolean(pending) || secondsLeft > 0}
            className="self-end"
          >
            Send
            <PaperPlaneTiltIcon size={18} aria-hidden="true" />
          </Button>
        </form>
      )}
    </section>
  );
}

function SuggestionList({
  title,
  suggestions,
  onPick,
}: {
  title: string;
  suggestions: readonly string[];
  onPick: (suggestion: string) => void;
}) {
  const titleId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={titleId} className="text-sm font-medium">
        {title}
      </p>
      <ul aria-labelledby={titleId} className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <Button
              variant="outline"
              className="h-auto rounded-full py-2 text-left whitespace-normal"
              onClick={() => onPick(suggestion)}
            >
              {suggestion}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <li className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="text-xs font-medium text-muted-foreground">
        {isUser ? "You" : "Planner"}
      </span>
      <p
        className={cn(
          "max-w-prose rounded-xl px-3 py-2 text-sm whitespace-pre-line",
          isUser ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
        )}
      >
        {text}
      </p>
    </li>
  );
}
