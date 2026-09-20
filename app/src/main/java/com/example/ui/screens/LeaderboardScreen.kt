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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SsidChart
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.example.data.TeamStanding
import com.example.data.TournamentDataRepository
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.BronzeMedal
import com.example.ui.theme.ErrorRed
import com.example.ui.theme.GoldMedal
import com.example.ui.theme.LiveGreen
import com.example.ui.theme.PrimaryContainer
import com.example.ui.theme.PrimaryOrange
import com.example.ui.theme.SilverMedal
import com.example.ui.theme.SurfaceBase
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceContainer
import com.example.ui.theme.SurfaceElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun LeaderboardScreen(
    onShareComparison: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedCategoryIndex by remember { mutableIntStateOf(0) }
    val categories = listOf(
        "Регионы ДФО (18+)",
        "Любители (Мужчины)",
        "Любители (Женщины)",
        "Продвинутые",
        "Мастера 40+"
    )

    var selectedWodFilterIndex by remember { mutableIntStateOf(0) }
    val wodFilters = listOf(
        "Все комплексы (Сумма)",
        "WOD 1: Сила",
        "WOD 2: Спринт",
        "WOD 3: Выносливость",
        "WOD 4: Гимнастика"
    )

    var searchQuery by remember { mutableStateOf("") }
    var showCompareDialog by remember { mutableStateOf(false) }

    val filteredTeams = remember(searchQuery) {
        if (searchQuery.isBlank()) {
            TournamentDataRepository.teams
        } else {
            TournamentDataRepository.teams.filter {
                it.region.contains(searchQuery, ignoreCase = true) ||
                        it.teamName.contains(searchQuery, ignoreCase = true) ||
                        it.captain.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceBase)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 10.dp, bottom = 86.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Horizontal Category Filters
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(categories.indices.toList()) { index ->
                        val isSelected = selectedCategoryIndex == index
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) PrimaryContainer else SurfaceCard)
                                .border(
                                    1.dp,
                                    if (isSelected) PrimaryOrange else BorderSubtle,
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { selectedCategoryIndex = index }
                                .padding(horizontal = 12.dp, vertical = 7.dp)
                                .testTag("leaderboard_category_chip_$index")
                        ) {
                            if (index == 0) {
                                Icon(
                                    imageVector = Icons.Default.Groups,
                                    contentDescription = null,
                                    tint = if (isSelected) Color.White else TextSecondary,
                                    modifier = Modifier.size(15.dp)
                                )
                            }
                            Text(
                                text = categories[index],
                                color = if (isSelected) Color.White else TextSecondary,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            // Secondary WOD Selector
            item {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(wodFilters.indices.toList()) { index ->
                        val isSelected = selectedWodFilterIndex == index
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) SurfaceElevated else Color.Transparent)
                                .clickable { selectedWodFilterIndex = index }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            if (index == 0) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(LiveGreen)
                                )
                            }
                            Text(
                                text = wodFilters[index],
                                color = if (isSelected) TextPrimary else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            // Search and Live Sync Bar
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Поиск",
                        tint = TextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    TextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = {
                            Text(
                                text = "Поиск по названию команды, атлету или региону...",
                                color = TextMuted,
                                fontSize = 12.sp
                            )
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .testTag("leaderboard_search_input")
                    )
                    Icon(
                        imageVector = Icons.Default.Tune,
                        contentDescription = "Фильтр",
                        tint = TextMuted,
                        modifier = Modifier
                            .size(18.dp)
                            .clickable { }
                    )
                }
            }

            // Compact Top-3 Podium Spotlight
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
                        .testTag("leaderboard_podium_spotlight")
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.EmojiEvents,
                                    contentDescription = null,
                                    tint = GoldMedal,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "ЛИДИРУЮЩАЯ ТРОЙКА ФИНАЛА",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.5.sp
                                )
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(LiveGreen)
                                )
                                Text(
                                    text = "Обновлено 2м назад",
                                    color = LiveGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // 3 Podium Items
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Bottom
                        ) {
                            // Rank 2: Хабаровск
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceElevated)
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.WorkspacePremium,
                                    contentDescription = null,
                                    tint = SilverMedal,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    text = "#2 РАНГ",
                                    color = SilverMedal,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(SurfaceContainer)
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                AsyncImage(
                                    model = "https://lh3.googleusercontent.com/aida-public/AB6AXuA71FBsotp__jwpfzRVs4IsqxjzoMV2tLufVTEAT9DUOi9ipGh0_Bpz1-t9n2T7-_a0Len7StIkct_qMoCyX1miVmXR2IAae-so9HyrFZ7GcehGiep_Axjzjzk8LP62mlMKVbZI62nrk0wODSUVTQR4U4sOrtJYvcd8zPQPFWRmXo2NXlWV4Px1HNNLsxv9M2hqy97-VyNAh7mG1K3E2E20LGwqFWb5kAPml1sTlfLY5l4ik2aMaUkLuA",
                                    contentDescription = "Хабаровск лого",
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape),
                                    contentScale = ContentScale.Crop
                                )
                                Text(
                                    text = "Хабаровск",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Тайфун",
                                    color = TextMuted,
                                    fontSize = 10.sp
                                )
                                Text(
                                    text = "382",
                                    color = TextPrimary,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "PTS",
                                    color = TextMuted,
                                    fontSize = 9.sp
                                )
                            }

                            // Rank 1: Приморье (Hero)
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                PrimaryContainer.copy(alpha = 0.25f),
                                                SurfaceElevated
                                            )
                                        )
                                    )
                                    .border(1.dp, PrimaryOrange.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MilitaryTech,
                                    contentDescription = null,
                                    tint = GoldMedal,
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "#1 ЛИДЕР",
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(PrimaryContainer)
                                        .padding(horizontal = 6.dp, vertical = 1.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                AsyncImage(
                                    model = "https://lh3.googleusercontent.com/aida-public/AB6AXuCP5QX5Yh--GITmWPBGKFsHNJwxKLTFC2prEUUfcvJqCETtKUdD8uFpSBFcW8Q8MOgzXcKCSsjkt4bc6Yaf-mdCzkkm299_kg5ZGV6VUHvp-_Syc9GAGcjwp6dx_JWPwAczUu5QiRPRlt8EJBzgCAevMQEbOmS3sfJdf9uTbIajrlEKQxGcEqcelCervx64yhoK0m6ARRcXzRoepiqQCtrnOJNfDUCglXSQrIhHSUkiGnTosCZcVyq8-w",
                                    contentDescription = "Приморье лого",
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape),
                                    contentScale = ContentScale.Crop
                                )
                                Text(
                                    text = "Приморье",
                                    color = TextPrimary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Тигры Востока",
                                    color = PrimaryOrange,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "415",
                                    color = PrimaryOrange,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "PTS",
                                    color = TextMuted,
                                    fontSize = 9.sp
                                )
                            }

                            // Rank 3: Сахалин
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceElevated)
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.WorkspacePremium,
                                    contentDescription = null,
                                    tint = BronzeMedal,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    text = "#3 РАНГ",
                                    color = BronzeMedal,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(SurfaceContainer)
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                AsyncImage(
                                    model = "https://lh3.googleusercontent.com/aida-public/AB6AXuCf4wX0P3iIovo6dQKnQPgSg-6ShpjybsuDLt_Xz8mn1udf9RK0uVpVCzUdrzYj0VECkQOucd3e4ze0ji2wVuCDA2JU-Tq747zXHYHJ0PcIShsYpmUl-wYf9OkSFjDX7bjlYWcOS5XxJ3M4-H_2tAa4bZO_GdfwLUGxU43OP_QC1hj8c8reAMi7UaOGIvgSc6X8EdRh8NlC8zw6EY501QKrvb7Pl18Ad72wkFqWxUvThdOoWvO4wgoS3w",
                                    contentDescription = "Сахалин лого",
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape),
                                    contentScale = ContentScale.Crop
                                )
                                Text(
                                    text = "Сахалин",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Островной Щит",
                                    color = TextMuted,
                                    fontSize = 10.sp
                                )
                                Text(
                                    text = "364",
                                    color = TextPrimary,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "PTS",
                                    color = TextMuted,
                                    fontSize = 9.sp
                                )
                            }
                        }
                    }
                }
            }

            // Leaderboard Table Section Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ПОЛОЖЕНИЕ КОМАНД (4 ИЗ 4 WOD)",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "ОЧКИ / СПЛИТ",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            // Teams Roster
            items(filteredTeams) { team ->
                TeamLeaderboardCard(team = team)
            }
        }

        // Sticky Bottom Dock: Primorye vs Khabarovsk Comparison
        Surface(
            color = SurfaceElevated.copy(alpha = 0.95f),
            shape = RoundedCornerShape(16.dp),
            shadowElevation = 8.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp)
                .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
                .testTag("leaderboard_compare_dock")
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row {
                        Box(
                            modifier = Modifier
                                .size(26.dp)
                                .clip(CircleShape)
                                .background(GoldMedal.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "#1",
                                color = GoldMedal,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(26.dp)
                                .clip(CircleShape)
                                .background(SilverMedal.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "#2",
                                color = SilverMedal,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Column {
                        Text(
                            text = "Приморье vs Хабаровск",
                            color = TextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Разрыв 33 очка • Аналитика",
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }
                }

                Button(
                    onClick = { showCompareDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryContainer),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("btn_open_compare")
                ) {
                    Icon(
                        imageVector = Icons.Default.Insights,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Сравнить",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Comparison Analytics Dialog / Sheet
        if (showCompareDialog) {
            Dialog(onDismissRequest = { showCompareDialog = false }) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(20.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
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
                                Icon(
                                    imageVector = Icons.Default.SsidChart,
                                    contentDescription = null,
                                    tint = PrimaryOrange,
                                    modifier = Modifier.size(22.dp)
                                )
                                Text(
                                    text = "Радар сравнения команд",
                                    color = TextPrimary,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            IconButton(
                                onClick = { showCompareDialog = false },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Закрыть",
                                    tint = TextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        // Team Badges Legend
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(SurfaceElevated)
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceAround,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(PrimaryOrange)
                                )
                                Text(
                                    text = "Приморский край",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF558DFF))
                                )
                                Text(
                                    text = "Хабаровский край",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        // Comparative Skill Bars
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            // WOD 1
                            ComparisonBar(
                                label = "WOD 1: Сила (Тяжелая атлетика)",
                                score1 = "100",
                                score2 = "95",
                                ratio1 = 0.51f
                            )

                            // WOD 2
                            ComparisonBar(
                                label = "WOD 2: Спринт & Гребля",
                                score1 = "95",
                                score2 = "100",
                                ratio1 = 0.48f
                            )

                            // WOD 3
                            ComparisonBar(
                                label = "WOD 3: Выносливость (Бег + Гири)",
                                score1 = "110",
                                score2 = "92",
                                ratio1 = 0.54f
                            )

                            // WOD 4
                            ComparisonBar(
                                label = "WOD 4: Гимнастика (Перекладина)",
                                score1 = "110",
                                score2 = "95",
                                ratio1 = 0.53f
                            )
                        }

                        // Tactical Summary Box
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(SurfaceElevated)
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Verified,
                                contentDescription = null,
                                tint = LiveGreen,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Приморский край удерживает лидерство за счет двойного отрыва в кардио и гимнастических связках (WOD 3 и 4). Хабаровск быстрее на чистом спринте.",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                lineHeight = 15.sp
                            )
                        }

                        Button(
                            onClick = {
                                showCompareDialog = false
                                onShareComparison()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SurfaceElevated),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = null,
                                tint = TextPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Поделиться карточкой матча",
                                color = TextPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ComparisonBar(
    label: String,
    score1: String,
    score2: String,
    ratio1: Float
) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                color = TextSecondary,
                fontSize = 11.sp
            )
            Text(
                text = "$score1 vs $score2 pts",
                color = TextPrimary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(CircleShape)
                .background(SurfaceContainer)
        ) {
            Box(
                modifier = Modifier
                    .weight(ratio1)
                    .fillMaxSize()
                    .background(PrimaryOrange)
            )
            Box(
                modifier = Modifier
                    .weight(1f - ratio1)
                    .fillMaxSize()
                    .background(Color(0xFF558DFF))
            )
        }
    }
}

@Composable
fun TeamLeaderboardCard(
    team: TeamStanding,
    modifier: Modifier = Modifier
) {
    val rankBadgeColor = when (team.rank) {
        1 -> GoldMedal
        2 -> SilverMedal
        3 -> BronzeMedal
        else -> TextMuted
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            .testTag("leaderboard_team_card_${team.rank}")
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Team Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(rankBadgeColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "#${team.rank}",
                            color = rankBadgeColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    AsyncImage(
                        model = team.logoUrl,
                        contentDescription = team.teamName,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = team.region,
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            // Rank Delta badge
                            if (team.rankDelta > 0) {
                                Text(
                                    text = "▲ +${team.rankDelta}",
                                    color = LiveGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            } else if (team.rankDelta < 0) {
                                Text(
                                    text = "▼ ${team.rankDelta}",
                                    color = ErrorRed,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            } else {
                                Text(
                                    text = "— 0",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Text(
                            text = "${team.teamName} • Кап: ${team.captain}",
                            color = TextSecondary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = team.totalPoints.toString(),
                        color = if (team.rank == 1) PrimaryOrange else TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = "PTS • ${team.pointsDiff}",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }
            }

            // WOD Breakdown Grid (4 columns)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceElevated.copy(alpha = 0.7f))
                    .padding(vertical = 8.dp, horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                // WOD 1
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "W1: СИЛА", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(text = team.w1Points.toString(), color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = team.w1Rank,
                        color = if (team.w1Rank.contains("1")) LiveGreen else TextSecondary,
                        fontSize = 9.sp
                    )
                }

                // WOD 2
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "W2: СПРИНТ", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(text = team.w2Points.toString(), color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = team.w2Rank,
                        color = if (team.w2Rank.contains("1")) LiveGreen else TextSecondary,
                        fontSize = 9.sp
                    )
                }

                // WOD 3
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "W3: ВЫНОСЛ", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(text = team.w3Points.toString(), color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = team.w3Rank,
                        color = if (team.w3Rank.contains("PR") || team.w3Rank.contains("1")) LiveGreen else TextSecondary,
                        fontSize = 9.sp
                    )
                }

                // WOD 4
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "W4: ГИМН", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(text = team.w4Points.toString(), color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = team.w4Rank,
                        color = if (team.w4Rank.contains("1")) LiveGreen else TextSecondary,
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}
