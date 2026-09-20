package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.FeedPost
import com.example.data.TournamentDataRepository
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.LiveGreen
import com.example.ui.theme.PrimaryContainer
import com.example.ui.theme.PrimaryOrange
import com.example.ui.theme.SurfaceBase
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceContainer
import com.example.ui.theme.SurfaceElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun FeedScreen(
    onShowMessageDialog: (title: String, message: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilterIndex by remember { mutableIntStateOf(0) }
    val filters = listOf("Все публикации", "Судейская коллегия", "Команды")

    val posts = remember {
        mutableStateListOf(
            FeedPost(
                id = 1,
                author = "Главный судья соревнований",
                initials = "ГТО",
                timeAgo = "12 мин назад",
                text = "Внимание атлетам заходов 5 и 6! Брифинг по гимнастическому комплексу начнется через 10 минут в разминочной зоне Арены ГТО.",
                isOfficial = true,
                likesCount = 34,
                commentsCount = 4
            ),
            FeedPost(
                id = 2,
                author = "Команда Приморья",
                initials = "ПК",
                timeAgo = "28 мин назад",
                text = "Парный комплекс закрыт с рекордом 08:42! Поддержка трибун ДВФУ невероятная 🔥 Готовимся к вечернему спринту!",
                isOfficial = false,
                likesCount = 46,
                commentsCount = 8
            ),
            FeedPost(
                id = 3,
                author = "Сахалинский десант",
                initials = "СХ",
                timeAgo = "45 мин назад",
                text = "Взяли максимум на выносливости в WOD 3! Островной дух не сломить 💪 Ждем выход второй двойки на помост.",
                isOfficial = false,
                likesCount = 29,
                commentsCount = 3
            ),
            FeedPost(
                id = 4,
                author = "Медиацентр Игр ГТО 2026",
                initials = "МЦ",
                timeAgo = "1 час назад",
                text = "Фотоотчет первого утреннего захода доступен в медиабанке турнира. Более 200 фотографий в высоком разрешении!",
                isOfficial = true,
                likesCount = 52,
                commentsCount = 11
            )
        )
    }

    var newPostText by remember { mutableStateOf("") }

    val filteredPosts = remember(selectedFilterIndex, posts.size) {
        when (selectedFilterIndex) {
            1 -> posts.filter { it.isOfficial }
            2 -> posts.filter { !it.isOfficial }
            else -> posts
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceBase)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Feed Header
        item {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "ГОЛОС АТЛЕТОВ И СУДЕЙ",
                    color = PrimaryOrange,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "Лента турнира & Чат",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        // Category Filter Chips
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filters.indices.toList()) { index ->
                    val isSelected = selectedFilterIndex == index
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) PrimaryContainer else SurfaceCard)
                            .border(1.dp, if (isSelected) PrimaryOrange else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { selectedFilterIndex = index }
                            .padding(horizontal = 12.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = filters[index],
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        // Create Post Box
        item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TextField(
                        value = newPostText,
                        onValueChange = { newPostText = it },
                        placeholder = {
                            Text(
                                text = "Написать сообщение участникам или судьям...",
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = SurfaceElevated,
                            unfocusedContainerColor = SurfaceElevated,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp)
                            .testTag("feed_new_post_input")
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        Button(
                            onClick = {
                                if (newPostText.isNotBlank()) {
                                    posts.add(
                                        0,
                                        FeedPost(
                                            id = posts.size + 1,
                                            author = "Алексей Волков (Тигры Востока)",
                                            initials = "АВ",
                                            timeAgo = "Только что",
                                            text = newPostText.trim(),
                                            isOfficial = false,
                                            likesCount = 1,
                                            commentsCount = 0,
                                            isLiked = true
                                        )
                                    )
                                    newPostText = ""
                                    onShowMessageDialog("Публикация", "Ваше сообщение отправлено в общую ленту турнира!")
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(36.dp).testTag("feed_btn_publish")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Опубликовать",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Posts List
        items(filteredPosts) { post ->
            var isLiked by remember(post.id) { mutableStateOf(post.isLiked) }
            var likesCount by remember(post.id) { mutableIntStateOf(post.likesCount) }

            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        1.dp,
                        if (post.isOfficial) PrimaryOrange.copy(alpha = 0.4f) else BorderSubtle,
                        RoundedCornerShape(14.dp)
                    )
                    .testTag("feed_card_${post.id}")
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(if (post.isOfficial) PrimaryContainer else SurfaceContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = post.initials,
                                    color = if (post.isOfficial) Color.White else TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = post.author,
                                        color = TextPrimary,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (post.isOfficial) {
                                        Icon(
                                            imageVector = Icons.Default.Campaign,
                                            contentDescription = "Официально",
                                            tint = PrimaryOrange,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = post.timeAgo,
                                    color = TextMuted,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }

                    Text(
                        text = post.text,
                        color = TextPrimary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        if (isLiked) {
                                            likesCount--
                                            isLiked = false
                                        } else {
                                            likesCount++
                                            isLiked = true
                                        }
                                    }
                                    .padding(4.dp)
                            ) {
                                Icon(
                                    imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                    contentDescription = "Лайк",
                                    tint = if (isLiked) PrimaryOrange else TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = likesCount.toString(),
                                    color = if (isLiked) PrimaryOrange else TextMuted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        onShowMessageDialog(
                                            "Комментарии к записи",
                                            "Открыть ветку обсуждения с участниками и болельщиками."
                                        )
                                    }
                                    .padding(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChatBubble,
                                    contentDescription = "Комментарии",
                                    tint = TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = post.commentsCount.toString(),
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        IconButton(
                            onClick = {
                                onShowMessageDialog("Поделиться", "Ссылка на новость скопирована!")
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Поделиться",
                                tint = TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
