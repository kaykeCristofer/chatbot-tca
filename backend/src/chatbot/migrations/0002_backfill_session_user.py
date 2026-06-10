from django.db import migrations


def ensure_session_user(apps, schema_editor):
    connection = schema_editor.connection
    table_name = "chatbot_session"
    existing_columns = {
        column.name for column in connection.introspection.get_table_description(
            connection.cursor(),
            table_name,
        )
    }

    User = apps.get_model("auth", "User")
    legacy_user, _ = User.objects.get_or_create(
        username="legacy_user",
        defaults={
            "email": "",
            "password": "!legacy-user-has-no-login",
        },
    )

    if "user_id" not in existing_columns:
        if connection.vendor == "postgresql":
            schema_editor.execute(
                f'ALTER TABLE "{table_name}" '
                'ADD COLUMN "user_id" integer '
                'REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED'
            )
        else:
            schema_editor.execute(
                f'ALTER TABLE "{table_name}" '
                'ADD COLUMN "user_id" integer '
                'REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED'
            )

    schema_editor.execute(
        f'UPDATE "{table_name}" SET "user_id" = {legacy_user.id} WHERE "user_id" IS NULL'
    )

    if connection.vendor == "postgresql":
        schema_editor.execute(
            f'ALTER TABLE "{table_name}" ALTER COLUMN "user_id" SET NOT NULL'
        )

    schema_editor.execute(
        f'CREATE INDEX IF NOT EXISTS "chatbot_ses_user_id_612ad7_idx" '
        f'ON "{table_name}" ("user_id", "last_activity" DESC)'
    )


class Migration(migrations.Migration):

    dependencies = [
        ("chatbot", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(ensure_session_user, migrations.RunPython.noop),
    ]
