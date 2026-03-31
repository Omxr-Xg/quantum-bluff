import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGetFriendLoansQuery,
  useAcceptFriendLoanRequestMutation,
  useRejectFriendLoanRequestMutation,
  useCancelFriendLoanRequestMutation,
} from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { getFriendLoanApiErrorMessage } from "../utils/friendLoanApiError";

type LoanUser = { id?: string; username?: string };

type LoanRequestApi = {
  id: string;
  status: string;
  amount: number;
  repaymentRate: number;
  totalDue: number;
  lender?: LoanUser;
  borrower?: LoanUser;
};

type LoanApi = {
  id: string;
  status: string;
  principalAmount: number;
  totalDue: number;
  repaidAmount: number;
  remainingAmount: number;
  repaymentRate: number;
  lender?: LoanUser;
  borrower?: LoanUser;
};

export function FriendLoansPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { data, isLoading, refetch } = useGetFriendLoansQuery(undefined, { skip: !userId });
  const [acceptReq, { isLoading: accL }] = useAcceptFriendLoanRequestMutation();
  const [rejectReq, { isLoading: rejL }] = useRejectFriendLoanRequestMutation();
  const [cancelReq, { isLoading: canL }] = useCancelFriendLoanRequestMutation();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const sent = (data.requestsSent ?? []) as LoanRequestApi[];
  const recv = (data.requestsReceived ?? []) as LoanRequestApi[];
  const active = (data.activeLoans ?? []) as LoanApi[];
  const done = (data.completedLoans ?? []) as LoanApi[];

  const busy = accL || rejL || canL;

  const handleAccept = async (id: string) => {
    try {
      await acceptReq({ loanRequestId: id }).unwrap();
      addToast(t("friends.loans.loanRequestOk"), "success");
      void refetch();
    } catch (err) {
      addToast(getFriendLoanApiErrorMessage(err, t("friends.loans.loanError")), "error");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReq({ loanRequestId: id }).unwrap();
      void refetch();
    } catch (err) {
      addToast(getFriendLoanApiErrorMessage(err, t("friends.loans.loanError")), "error");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReq({ loanRequestId: id }).unwrap();
      void refetch();
    } catch (err) {
      addToast(getFriendLoanApiErrorMessage(err, t("friends.loans.loanError")), "error");
    }
  };

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/40 p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-bold text-amber-200">{title}</h2>
      {children}
    </div>
  );

  const empty = <p className="text-gray-500">{t("friends.loans.empty")}</p>;

  return (
    <div className="space-y-2">
      <h2 className="mb-4 text-xl font-bold text-white">{t("friends.loans.title")}</h2>

      <Section title={t("friends.loans.sentRequests")}>
        {sent.length === 0
          ? empty
          : sent.map((r) => (
              <div key={r.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-600 bg-slate-900/40 p-3">
                <div>
                  <p className="text-white">
                    {t("friends.loans.toUser", { username: r.lender?.username ?? "—" })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {r.amount} → {r.totalDue} ({r.repaymentRate}%) · {t("friends.loans.status", { status: r.status })}
                  </p>
                </div>
                {r.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCancel(r.id)}
                    className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-500 disabled:opacity-50"
                  >
                    {t("friends.loans.cancel")}
                  </button>
                ) : null}
              </div>
            ))}
      </Section>

      <Section title={t("friends.loans.receivedRequests")}>
        {recv.length === 0
          ? empty
          : recv.map((r) => (
              <div key={r.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-600 bg-slate-900/40 p-3">
                <div>
                  <p className="text-white">
                    {t("friends.loans.fromUser", { username: r.borrower?.username ?? "—" })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {r.amount} → {t("friends.loans.totalDue", { amount: r.totalDue })} · {r.repaymentRate}%
                  </p>
                </div>
                {r.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAccept(r.id)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      {t("friends.loans.accept")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReject(r.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {t("friends.loans.reject")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
      </Section>

      <Section title={t("friends.loans.activeLoans")}>
        {active.length === 0
          ? empty
          : active.map((lo) => (
              <div key={lo.id} className="mb-2 rounded-lg border border-slate-600 bg-slate-900/40 p-3">
                <p className="text-white">
                  {lo.borrower?.id === userId
                    ? t("friends.loans.fromUser", { username: lo.lender?.username ?? "—" })
                    : t("friends.loans.toUser", { username: lo.borrower?.username ?? "—" })}
                </p>
                <p className="text-sm text-amber-100">
                  {t("friends.loans.remaining", { amount: lo.remainingAmount })} ·{" "}
                  {t("friends.loans.repaid", { amount: lo.repaidAmount, total: lo.totalDue })}
                </p>
              </div>
            ))}
      </Section>

      <Section title={t("friends.loans.completedLoans")}>
        {done.length === 0
          ? empty
          : done.map((lo) => (
              <div key={lo.id} className="mb-2 rounded-lg border border-slate-600 bg-slate-900/40 p-3 text-gray-300">
                <p>
                  {lo.borrower?.id === userId
                    ? t("friends.loans.fromUser", { username: lo.lender?.username ?? "—" })
                    : t("friends.loans.toUser", { username: lo.borrower?.username ?? "—" })}
                </p>
                <p className="text-sm">{t("friends.loans.repaid", { amount: lo.totalDue, total: lo.totalDue })}</p>
              </div>
            ))}
      </Section>
    </div>
  );
}
