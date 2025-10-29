# Миграция базы данных: userId → TEXT

## Описание
Эта миграция изменяет тип колонки `user_id` с `UUID` на `TEXT` в таблицах:
- `territory_claims`
- `dropmap_eligible_players`

Это необходимо для поддержки **виртуальных игроков** (инвайтов), которые имеют ID вида `virtual-invite-XXXXX-timestamp` вместо UUID.

## Как запустить

```bash
npm run migrate:userid
```

## Что делает миграция

1. Удаляет foreign key constraint с `territory_claims.user_id → users.id`
2. Изменяет тип `territory_claims.user_id` с `UUID` на `TEXT`
3. Удаляет foreign key constraint с `dropmap_eligible_players.user_id → users.id`
4. Изменяет тип `dropmap_eligible_players.user_id` с `UUID` на `TEXT`

## После миграции

После успешного выполнения:
- ✅ Инвайтнутые игроки будут автоматически добавляться в список игроков
- ✅ Инвайтнутых игроков можно добавлять/убирать с локаций через UI
- ✅ Инвайты перестанут дублироваться в меню
- ✅ Страница принятия инвайта будет работать без ошибок UUID

## Откат (если нужно)

Если потребуется откатить изменения:

```sql
-- ВНИМАНИЕ: Это удалит все виртуальные ID!
DELETE FROM territory_claims WHERE user_id NOT LIKE '%-%-%-%-%';
DELETE FROM dropmap_eligible_players WHERE user_id NOT LIKE '%-%-%-%-%';

ALTER TABLE territory_claims
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ADD CONSTRAINT territory_claims_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE dropmap_eligible_players
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ADD CONSTRAINT dropmap_eligible_players_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```
