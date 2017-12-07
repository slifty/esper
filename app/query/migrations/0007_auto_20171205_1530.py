# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-12-05 23:30
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('query', '0006_auto_20171205_1528'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tvnews_video',
            name='channel',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_query_name='video', to='query.tvnews_Channel'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='tvnews_video',
            name='show',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_query_name='video', to='query.tvnews_Show'),
            preserve_default=False,
        ),
    ]
