package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Height
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockClock
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Pool
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SmartDisplay
import androidx.compose.material.icons.filled.Stadium
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.GoldMedal
import com.example.ui.theme.LiveGreen
import com.example.ui.theme.PrimaryContainer
import com.example.ui.theme.PrimaryOrange
import com.example.ui.theme.SecondaryContainer
import com.example.ui.theme.SilverMedal
import com.example.ui.theme.SurfaceBase
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceContainer
import com.example.ui.theme.SurfaceContainerHigh
import com.example.ui.theme.SurfaceElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@Composable
fun ComplexesScreen(
    onWatchLive: () -> Unit,
    onShowMessageDialog: (title: String, message: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedDayIndex by remember { mutableIntStateOf(0) }
    val days = listOf("ДЕНЬ 1 (ПТ, 31 АВГ)", "ДЕНЬ 2 (СБ, 1 СЕН)", "ДЕНЬ 3 (ВС, 2 СЕН)", "ФИНАЛ")

    // Real-time ticking countdown for locked WOD 4
    var countdownSeconds by remember { mutableIntStateOf(2 * 3600 + 44 * 60 + 14) }
    LaunchedEffect(Unit) {
        while (countdownSeconds > 0) {
            delay(1000L)
            countdownSeconds--
        }
    }

    val hours = (countdownSeconds / 3600).toString().padStart(2, '0')
    val minutes = ((countdownSeconds % 3600) / 60).toString().padStart(2, '0')
    val seconds = (countdownSeconds % 60).toString().padStart(2, '0')
    val timerString = "$hours:$minutes:$seconds"

    var wod1Expanded by remember { mutableStateOf(false) }
    var wod2Expanded by remember { mutableStateOf(false) }
    var wod4ReminderSet by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceBase)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Day Selector Carousel
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(days.indices.toList()) { index ->
                    val isSelected = selectedDayIndex == index
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) PrimaryContainer else SurfaceCard)
                            .border(1.dp, if (isSelected) PrimaryOrange else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { selectedDayIndex = index }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                            .testTag("complexes_day_chip_$index")
                    ) {
                        if (index == 3) {
                            Icon(
                                imageVector = Icons.Default.EmojiEvents,
                                contentDescription = null,
                                tint = GoldMedal,
                                modifier = Modifier.size(14.dp)
                            )
                        } else if (isSelected) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(Color.White)
                            )
                        }
                        Text(
                            text = days[index],
                            color = if (isSelected) Color.White else if (index == 3) GoldMedal else TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Tournament Metrics / Progress Overview Bar
        item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
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
                                imageVector = Icons.Default.FitnessCenter,
                                contentDescription = null,
                                tint = PrimaryOrange,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "Программа дня",
                                color = TextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "6 КОМПЛЕКСОВ",
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Progress Track
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(CircleShape)
                            .background(SurfaceContainerHigh)
                            .padding(1.dp),
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(SecondaryContainer))
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(SecondaryContainer))
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(SecondaryContainer))
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(SecondaryContainer))
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(PrimaryOrange))
                        Box(modifier = Modifier.weight(1f).fillMaxSize().clip(CircleShape).background(SurfaceContainer))
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(SecondaryContainer))
                            Text(text = "4 завершено", color = TextSecondary, fontSize = 11.sp)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(PrimaryOrange))
                            Text(text = "1 в эфире", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(SurfaceContainer))
                            Text(text = "1 засекречен", color = TextMuted, fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        // Card 1: Комплекс 3 (LIVE NOW)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
                    .testTag("complex_card_live_wod3")
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Top Header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(LiveGreen.copy(alpha = 0.15f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(LiveGreen))
                                    Text(
                                        text = "HEAT 4 • LIVE",
                                        color = LiveGreen,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "ВОДНЫЙ КЛАСТЕР",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Комплекс 3: Морской десант",
                                color = TextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "ЛИМИТ ВРЕМЕНИ",
                                color = TextMuted,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "10:00",
                                color = PrimaryOrange,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    // Format & Venue
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = PrimaryOrange,
                                modifier = Modifier.size(15.dp)
                            )
                            Text(text = "For Time (На время)", color = TextSecondary, fontSize = 11.sp)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Stadium,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(15.dp)
                            )
                            Text(text = "Бухта Новик, Пирс №2", color = TextSecondary, fontSize = 11.sp)
                        }
                    }

                    // Exercise Protocol Grid
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(SurfaceElevated)
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "ЗАДАНИЕ ЭТАПА",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )

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
                                    imageVector = Icons.Default.Pool,
                                    contentDescription = null,
                                    tint = SecondaryContainer,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(text = "300м Заплыв в открытой воде", color = TextPrimary, fontSize = 12.sp)
                            }
                            Text(text = "Брасс/Кроль", color = TextSecondary, fontSize = 11.sp)
                        }

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
                                    imageVector = Icons.Default.Height,
                                    contentDescription = null,
                                    tint = SecondaryContainer,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(text = "4 Подъема по канату без ног", color = TextPrimary, fontSize = 12.sp)
                            }
                            Text(text = "Высота 4.5м", color = TextSecondary, fontSize = 11.sp)
                        }

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
                                    imageVector = Icons.Default.DirectionsRun,
                                    contentDescription = null,
                                    tint = SecondaryContainer,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(text = "50 Выпадов с мешком песка", color = TextPrimary, fontSize = 12.sp)
                            }
                            Text(text = "30 кг", color = TextSecondary, fontSize = 11.sp)
                        }
                    }

                    // Current Heat Leader
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceContainerHigh.copy(alpha = 0.6f))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(LiveGreen))
                            Text(text = "Лидер захода:", color = TextSecondary, fontSize = 11.sp)
                            Text(
                                text = "А. Белов (Приморский край)",
                                color = TextPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "06:14",
                            color = SecondaryContainer,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Card Actions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onWatchLive,
                            colors = ButtonDefaults.buttonColors(containerColor = LiveGreen),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .testTag("btn_complex_watch_live")
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayCircle,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Прямой эфир",
                                color = Color.Black,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        IconButton(
                            onClick = {
                                onShowMessageDialog(
                                    "Поделиться комплексом",
                                    "Ссылка на прямой эфир Комплекса 3 скопирована в буфер обмена!"
                                )
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(SurfaceElevated)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Поделиться",
                                tint = TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }

        // Card 2: Комплекс 1 (ЗАВЕРШЕН)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(SurfaceElevated)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = SecondaryContainer,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "ЗАВЕРШЕН",
                                        color = TextSecondary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "ПОМОСТ А",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Комплекс 1: Тихоокеанская тяга",
                                color = TextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "КАП",
                                color = TextMuted,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "12:00",
                                color = TextSecondary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Alarm, contentDescription = null, tint = TextMuted, modifier = Modifier.size(15.dp))
                            Text(text = "For Time (21-15-9)", color = TextSecondary, fontSize = 11.sp)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Stadium, contentDescription = null, tint = TextMuted, modifier = Modifier.size(15.dp))
                            Text(text = "Арена ГТО", color = TextSecondary, fontSize = 11.sp)
                        }
                    }

                    // Task details
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceElevated.copy(alpha = 0.7f))
                            .padding(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "21-15-9:",
                                color = PrimaryOrange,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Становая тяга 100 кг • Выходы на кольцах",
                                color = TextPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text = "Финальный отрезок: Челночный бег 4 × 10 метров с касанием тумбы.",
                            color = TextMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }

                    // Best Result
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceElevated)
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WorkspacePremium,
                                contentDescription = null,
                                tint = GoldMedal,
                                modifier = Modifier.size(18.dp)
                            )
                            Column {
                                Text(
                                    text = "ЛУЧШИЙ РЕЗУЛЬТАТ ТУРНИРА",
                                    color = TextMuted,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Д. Ковалев (Хабаровский край)",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Text(
                            text = "07:42",
                            color = GoldMedal,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Accordion: Standards
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceContainer)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { wod1Expanded = !wod1Expanded }
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.FactCheck,
                                    contentDescription = null,
                                    tint = PrimaryOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Стандарты движений и видеодемонстрация",
                                    color = TextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Icon(
                                imageVector = if (wod1Expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        AnimatedVisibility(visible = wod1Expanded) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 12.dp, end = 12.dp, bottom = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Verified,
                                        contentDescription = null,
                                        tint = SecondaryContainer,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "Становая тяга: Полное выпрямление в коленных и тазобедренных суставах, плечи за линией грифа.",
                                        color = TextSecondary,
                                        fontSize = 11.sp
                                    )
                                }

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Verified,
                                        contentDescription = null,
                                        tint = SecondaryContainer,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "Выход силой: Фиксация в упоре на прямых руках, локти заблокированы в верхней точке.",
                                        color = TextSecondary,
                                        fontSize = 11.sp
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clickable {
                                            onShowMessageDialog(
                                                "Видеостандарт",
                                                "Воспроизведение эталонного видео Комплекса 1 (01:24) с разбором судейских критериев."
                                            )
                                        }
                                        .padding(top = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.SmartDisplay,
                                        contentDescription = null,
                                        tint = PrimaryOrange,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Смотреть эталонное видео (01:24)",
                                        color = PrimaryOrange,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Card 3: Комплекс 2 (ЗАВЕРШЕН)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(SurfaceElevated)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = SecondaryContainer,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "ЗАВЕРШЕН",
                                        color = TextSecondary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "ОТКРЫТЫЙ СТАДИОН",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Комплекс 2: Штурм сопки",
                                color = TextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "ФОРМАТ",
                                color = TextMuted,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "15:00",
                                color = TextSecondary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Repeat, contentDescription = null, tint = TextMuted, modifier = Modifier.size(15.dp))
                            Text(text = "AMRAP (Максимум кругов)", color = TextSecondary, fontSize = 11.sp)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Stadium, contentDescription = null, tint = TextMuted, modifier = Modifier.size(15.dp))
                            Text(text = "Стадион ДВФУ", color = TextSecondary, fontSize = 11.sp)
                        }
                    }

                    // Protocol description
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceElevated.copy(alpha = 0.7f))
                            .padding(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = "400м бег с жилетом 15 кг", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Text(text = "•", color = TextMuted, fontSize = 12.sp)
                            Text(text = "30 бросков мяча 9 кг", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Text(
                            text = "20 запрыгиваний на тумбу 60 см с полным контролем на вершине.",
                            color = TextMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }

                    // Best Result
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceElevated)
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WorkspacePremium,
                                contentDescription = null,
                                tint = SilverMedal,
                                modifier = Modifier.size(18.dp)
                            )
                            Column {
                                Text(
                                    text = "ЛУЧШИЙ РЕЗУЛЬТАТ ТУРНИРА",
                                    color = TextMuted,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "В. Степанов (Сахалинская обл.)",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Text(
                            text = "5 раундов + 18",
                            color = SilverMedal,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Accordion: Standards
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceContainer)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { wod2Expanded = !wod2Expanded }
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.FactCheck,
                                    contentDescription = null,
                                    tint = PrimaryOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Нормативы судейства",
                                    color = TextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Icon(
                                imageVector = if (wod2Expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        AnimatedVisibility(visible = wod2Expanded) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 12.dp, end = 12.dp, bottom = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = SecondaryContainer, modifier = Modifier.size(14.dp))
                                    Text(text = "Броски мяча: Таз опускается ниже колена в седе, касание мишени на высоте 3.05м.", color = TextSecondary, fontSize = 11.sp)
                                }
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = SecondaryContainer, modifier = Modifier.size(14.dp))
                                    Text(text = "Запрыгивания: Разрешен шаг вниз, обязательна фиксация на двух стопах наверху.", color = TextSecondary, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Card 4: Комплекс 4 (ЗАСЕКРЕЧЕНО / ТАЙМЕР)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(SurfaceElevated)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LockClock,
                                        contentDescription = null,
                                        tint = PrimaryOrange,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "ЗАСЕКРЕЧЕНО",
                                        color = PrimaryOrange,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "ГЛАВНАЯ АРЕНА",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Комплекс 4: Финальное многоборье ГТО",
                                color = TextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(SurfaceElevated),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Text(
                        text = "Задание держится в тайне оргкомитетом до официального вечернего брифинга главных судей и капитанов команд.",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )

                    // Countdown Container
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(SurfaceElevated)
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "ОТКРЫТИЕ ПРОТОКОЛА ЧЕРЕЗ:",
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Row(
                                verticalAlignment = Alignment.Bottom,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = timerString,
                                    color = PrimaryOrange,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "до 18:00",
                                    color = TextMuted,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Button(
                            onClick = {
                                wod4ReminderSet = !wod4ReminderSet
                                if (wod4ReminderSet) {
                                    onShowMessageDialog(
                                        "Напоминание установлено",
                                        "Вы получите push-уведомление в 17:50, за 10 минут до раскрытия протокола Комплекса 4."
                                    )
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (wod4ReminderSet) LiveGreen.copy(alpha = 0.2f) else SurfaceContainerHigh
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(38.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.NotificationsActive,
                                contentDescription = null,
                                tint = if (wod4ReminderSet) LiveGreen else TextPrimary,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (wod4ReminderSet) "Установлено ✓" else "Напомнить",
                                color = if (wod4ReminderSet) LiveGreen else TextPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Download CTA
        item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
                    .clickable {
                        onShowMessageDialog(
                            "Загрузка регламента",
                            "Файл «Стандарты и регламент судейства Игры ГТО 2026.pdf» (4.8 МБ) сохранен в папку Загрузки."
                        )
                    }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(PrimaryContainer.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PictureAsPdf,
                                contentDescription = null,
                                tint = PrimaryOrange,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "Стандарты и регламент судейства",
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "PDF, 4.8 МБ • Редакция от 28 августа",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = "Скачать",
                        tint = TextSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
