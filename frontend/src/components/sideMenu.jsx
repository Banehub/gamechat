import styles from "../styles/sidemenu.module.css";

export default function SideMenu() {
    // Dummy user data
    const users = [
        { name: "John Doe", status: "online" },
        { name: "Alice Smith", status: "offline" },
        { name: "Bob Johnson", status: "online" },
        { name: "Emma Wilson", status: "online" },
        { name: "Mike Brown", status: "offline" },
        { name: "Sarah Davis", status: "online" },
    ];

    return (
        <div className={styles.sideMenu}>
            <div className={styles.userList}>
                {/* <h2 className={styles.title}>Users</h2> */}
                {users.map((user, index) => (
                    <div key={index} className={styles.userItem}>
                        <span className={`${styles.status} ${styles[user.status]}`}></span>
                        <span className={styles.userName}>{user.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
