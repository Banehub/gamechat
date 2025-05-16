import styles from "../styles/modal.module.css";


export default function Modal() {
    return (
        <div className={styles.modal}>
         <div className={styles.modal_content}>
            {/* <h1>Login</h1> */}
            <form className={styles.modal_form}>
                <input type="text" placeholder="Username" />
                <input type="password" placeholder="Password" />
                <button type="submit">Login</button>
                <p className={styles.modal_form_p}>Don't have an account? <a href="/register">Sign up</a></p>
            </form>
          
         </div>
        </div>
    )
}
