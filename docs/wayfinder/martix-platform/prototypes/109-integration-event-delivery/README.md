# Prototype result — Integration Event delivery state model

The throwaway interactive prototype asked whether a leased Transactional
Outbox plus an atomic consumer Inbox Receipt preserves at-least-once transport
delivery and one committed consumer effect when the dispatcher fails between
consumer commit and acknowledgement.

The critical sequence committed one Outbox Message, leased and delivered it,
committed the consumer effect and Inbox Receipt, crashed before acknowledgement,
expired the lease and redelivered the same Message. The resulting state had two
transport deliveries, one completed Receipt and one committed consumer effect.

The user accepted this behavior on 2026-07-18. The executable prototype was
deleted as throwaway code. Its complete durable contract and rationale now live
in [Specify Integration Event, outbox, and inbox semantics](../../tickets/109-integration-event-delivery.md).
